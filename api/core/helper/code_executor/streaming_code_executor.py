import json
import logging
from collections.abc import Mapping, Generator
from enum import StrEnum
from typing import Any, Optional, Dict

import httpx
from httpx import Timeout
from yarl import URL

from configs import dify_config
from core.helper.code_executor.code_executor import (
    CodeExecutionError,
    CodeExecutionResponse,
    CodeLanguage,
    CodeExecutor,
)

logger = logging.getLogger(__name__)
code_execution_endpoint_url = URL(str(dify_config.CODE_EXECUTION_ENDPOINT))


class StreamEvent:
    """SSE流事件数据结构"""
    
    def __init__(self, event_type: str, data: Dict[str, Any], timestamp: str):
        self.event_type = event_type
        self.data = data
        self.timestamp = timestamp
        
    @property
    def is_log(self) -> bool:
        return self.event_type == "log"
        
    @property
    def is_complete(self) -> bool:
        return self.event_type == "complete"
        
    @property
    def is_start(self) -> bool:
        return self.event_type == "start"
        
    @property
    def log_type(self) -> Optional[str]:
        """返回日志类型：stdout或stderr"""
        if self.is_log:
            return self.data.get("type")
        return None
        
    @property
    def log_content(self) -> Optional[str]:
        """返回日志内容"""
        if self.is_log:
            return self.data.get("content")
        return None
        
    @property
    def result(self) -> Optional[Dict[str, Any]]:
        """返回最终执行结果"""
        if self.is_complete:
            return self.data.get("result")
        return None


class StreamingCodeExecutor(CodeExecutor):
    """流式代码执行器 - 支持实时日志输出"""
    
    @classmethod
    def execute_code_streaming(
        cls, 
        language: CodeLanguage, 
        preload: str, 
        code: str
    ) -> Generator[StreamEvent, None, None]:
        """
        流式执行代码，返回实时事件流
        :param language: 代码语言
        :param preload: 预加载脚本
        :param code: 代码
        :return: 流式事件生成器
        """
        url = code_execution_endpoint_url / "v1" / "sandbox" / "run_streaming"
        
        headers = {
            "X-Api-Key": dify_config.CODE_EXECUTION_API_KEY,
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        
        data = {
            "language": cls.code_language_to_running_language.get(language),
            "code": code,
            "preload": preload,
            "enable_network": True,
        }
        
        try:
            with httpx.stream(
                "POST",
                str(url),
                json=data,
                headers=headers,
                timeout=Timeout(
                    connect=dify_config.CODE_EXECUTION_CONNECT_TIMEOUT,
                    read=dify_config.CODE_EXECUTION_READ_TIMEOUT,
                    write=dify_config.CODE_EXECUTION_WRITE_TIMEOUT,
                    pool=None,
                ),
            ) as response:
                if response.status_code == 503:
                    raise CodeExecutionError("Code execution service is unavailable")
                elif response.status_code != 200:
                    raise CodeExecutionError(
                        f"Failed to execute code, got status code {response.status_code}, "
                        f"please check if the sandbox service is running"
                    )
                
                # 处理SSE事件流
                current_event = None
                current_data = ""
                
                for line in response.iter_lines():
                    line = line.strip()
                    
                    if not line:
                        # 空行表示事件结束，处理当前事件
                        if current_event and current_data:
                            try:
                                data_obj = json.loads(current_data)
                                event = StreamEvent(
                                    event_type=current_event,
                                    data=data_obj,
                                    timestamp=data_obj.get("timestamp", "")
                                )
                                yield event
                                
                                # 如果是完成事件，检查是否有错误
                                if event.is_complete and event.result:
                                    result = event.result
                                    if result.get("error"):
                                        raise CodeExecutionError(result["error"])
                                        
                            except json.JSONDecodeError as e:
                                logger.warning(f"Failed to parse SSE data: {current_data}, error: {e}")
                                
                        # 重置当前事件
                        current_event = None
                        current_data = ""
                        continue
                    
                    if line.startswith("event:"):
                        current_event = line[6:].strip()
                    elif line.startswith("data:"):
                        current_data = line[5:].strip()
                        
        except httpx.RequestError as e:
            raise CodeExecutionError(
                f"Failed to execute code, network error: {str(e)}. "
                f"Please check if the sandbox service is running."
            )
        except Exception as e:
            raise CodeExecutionError(
                f"Failed to execute streaming code: {str(e)}"
            )
    
    @classmethod
    def execute_workflow_code_template_streaming(
        cls, 
        language: CodeLanguage, 
        code: str, 
        inputs: Mapping[str, Any]
    ) -> Generator[StreamEvent, None, None]:
        """
        流式执行工作流代码模板
        :param language: 代码语言
        :param code: 代码
        :param inputs: 输入变量
        :return: 流式事件生成器
        """
        template_transformer = cls.code_template_transformers.get(language)
        if not template_transformer:
            raise CodeExecutionError(f"Unsupported language {language}")
        
        runner, preload = template_transformer.transform_caller(code, inputs)
        
        try:
            # 使用流式执行
            final_result = None
            
            for event in cls.execute_code_streaming(language, preload, runner):
                yield event
                
                # 保存最终结果用于转换
                if event.is_complete and event.result:
                    final_result = event.result
            
            # 如果有最终结果，进行转换（用于返回格式化的结果）
            if final_result and final_result.get("stdout"):
                transformed_result = template_transformer.transform_response(final_result["stdout"])
                # 可以在这里发送一个额外的转换完成事件
                yield StreamEvent(
                    event_type="transformed",
                    data={"result": transformed_result},
                    timestamp=""
                )
                
        except CodeExecutionError as e:
            raise e
        except Exception as e:
            raise CodeExecutionError(f"Failed to execute streaming workflow code: {str(e)}")
