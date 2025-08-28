#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dify 数据库分析工具

用于分析数据库表的记录数量、大小，并提供清理建议。
特别关注工作流运行记录相关的表，帮助识别可以安全清理的数据。
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd


class DatabaseAnalyzer:
    def __init__(self, host: str = 'localhost', port: int = 5432, 
                 database: str = 'dify', username: str = 'postgres', 
                 password: str = 'difyai123456'):
        """初始化数据库连接"""
        self.connection_params = {
            'host': host,
            'port': port,
            'database': database,
            'user': username,
            'password': password
        }
        self.conn = None
        self.cursor = None
        
    def connect(self):
        """连接到数据库"""
        try:
            self.conn = psycopg2.connect(**self.connection_params)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print(f"✅ 成功连接到数据库: {self.connection_params['database']}")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开数据库连接"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("🔌 数据库连接已断开")
    
    def get_table_info(self) -> List[Dict]:
        """获取所有表的基本信息"""
        query = """
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                          pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        """
        
        self.cursor.execute(query)
        return self.cursor.fetchall()
    
    def get_table_row_counts(self) -> Dict[str, int]:
        """获取所有表的记录数"""
        query = """
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
        """
        
        self.cursor.execute(query)
        tables = [row['tablename'] for row in self.cursor.fetchall()]
        
        row_counts = {}
        for table in tables:
            try:
                count_query = f"SELECT COUNT(*) as count FROM {table};"
                self.cursor.execute(count_query)
                result = self.cursor.fetchone()
                row_counts[table] = result['count']
            except Exception as e:
                print(f"⚠️  无法统计表 {table} 的记录数: {e}")
                row_counts[table] = 0
                
        return row_counts
    
    def analyze_workflow_tables(self) -> Dict[str, Dict]:
        """分析工作流相关表的详细信息"""
        workflow_tables = [
            'workflow_runs',
            'workflow_node_executions', 
            'workflow_app_logs',
            'workflow_execution_logs',  # 我们新创建的表
            'messages',
            'message_agent_thoughts',
            'message_chains',
            'conversations',
            'celery_taskmeta'
        ]
        
        analysis = {}
        
        for table in workflow_tables:
            try:
                # 检查表是否存在
                check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
                """
                self.cursor.execute(check_query, (table,))
                if not self.cursor.fetchone()['exists']:
                    print(f"⚠️  表 {table} 不存在")
                    continue
                
                # 获取表的基本统计信息
                info = {
                    'table_name': table,
                    'row_count': 0,
                    'size_bytes': 0,
                    'oldest_record': None,
                    'newest_record': None,
                    'avg_age_days': 0
                }
                
                # 记录数统计
                count_query = f"SELECT COUNT(*) as count FROM {table};"
                self.cursor.execute(count_query)
                info['row_count'] = self.cursor.fetchone()['count']
                
                # 表大小
                size_query = f"""
                SELECT pg_total_relation_size('{table}') as size_bytes;
                """
                self.cursor.execute(size_query)
                info['size_bytes'] = self.cursor.fetchone()['size_bytes']
                
                # 时间字段分析
                time_columns = ['created_at', 'updated_at', 'finished_at', 'date_done']
                date_column = None
                
                for col in time_columns:
                    try:
                        test_query = f"SELECT {col} FROM {table} LIMIT 1;"
                        self.cursor.execute(test_query)
                        date_column = col
                        break
                    except:
                        continue
                
                if date_column and info['row_count'] > 0:
                    # 最老和最新记录
                    date_range_query = f"""
                    SELECT 
                        MIN({date_column}) as oldest,
                        MAX({date_column}) as newest,
                        AVG(EXTRACT(days FROM (NOW() - {date_column}))) as avg_age_days
                    FROM {table}
                    WHERE {date_column} IS NOT NULL;
                    """
                    self.cursor.execute(date_range_query)
                    result = self.cursor.fetchone()
                    info['oldest_record'] = result['oldest']
                    info['newest_record'] = result['newest'] 
                    info['avg_age_days'] = float(result['avg_age_days']) if result['avg_age_days'] else 0
                
                analysis[table] = info
                
            except Exception as e:
                print(f"⚠️  分析表 {table} 时出错: {e}")
                
        return analysis
    
    def get_cleanup_recommendations(self, workflow_analysis: Dict[str, Dict]) -> List[Dict]:
        """生成清理建议"""
        recommendations = []
        
        for table, info in workflow_analysis.items():
            if info['row_count'] == 0:
                continue
                
            recommendation = {
                'table': table,
                'priority': 'low',
                'reason': '',
                'suggested_action': '',
                'potential_savings': info['size_bytes']
            }
            
            # 根据表名和数据特征给出建议
            if table == 'workflow_runs':
                if info['row_count'] > 10000:
                    recommendation['priority'] = 'high'
                    recommendation['reason'] = f"工作流运行记录过多({info['row_count']:,}条)，可能影响性能"
                    recommendation['suggested_action'] = "删除30天前的调试运行记录，保留重要的生产运行记录"
                elif info['row_count'] > 1000:
                    recommendation['priority'] = 'medium'
                    recommendation['reason'] = f"工作流运行记录较多({info['row_count']:,}条)"
                    recommendation['suggested_action'] = "删除90天前的调试运行记录"
                    
            elif table == 'workflow_node_executions':
                if info['row_count'] > 50000:
                    recommendation['priority'] = 'high'
                    recommendation['reason'] = f"节点执行记录过多({info['row_count']:,}条)，占用大量存储空间"
                    recommendation['suggested_action'] = "删除30天前的节点执行记录"
                elif info['row_count'] > 5000:
                    recommendation['priority'] = 'medium'
                    recommendation['reason'] = f"节点执行记录较多({info['row_count']:,}条)"
                    recommendation['suggested_action'] = "删除90天前的节点执行记录"
                    
            elif table == 'workflow_execution_logs':
                if info['row_count'] > 100000:
                    recommendation['priority'] = 'high'
                    recommendation['reason'] = f"执行日志记录过多({info['row_count']:,}条)，这是调试数据"
                    recommendation['suggested_action'] = "删除7天前的执行日志，或保留最近的关键日志"
                elif info['row_count'] > 10000:
                    recommendation['priority'] = 'medium' 
                    recommendation['reason'] = f"执行日志记录较多({info['row_count']:,}条)"
                    recommendation['suggested_action'] = "删除30天前的执行日志"
                    
            elif table == 'messages':
                if info['avg_age_days'] > 90 and info['row_count'] > 10000:
                    recommendation['priority'] = 'medium'
                    recommendation['reason'] = f"消息记录较多且较旧(平均{info['avg_age_days']:.1f}天)"
                    recommendation['suggested_action'] = "归档或删除90天前的消息记录"
                    
            elif table == 'celery_taskmeta':
                if info['row_count'] > 1000:
                    recommendation['priority'] = 'high'
                    recommendation['reason'] = f"Celery任务元数据过多({info['row_count']:,}条)，这是临时数据"
                    recommendation['suggested_action'] = "删除7天前的Celery任务记录"
                    
            elif table in ['message_agent_thoughts', 'message_chains']:
                if info['row_count'] > 5000:
                    recommendation['priority'] = 'medium'
                    recommendation['reason'] = f"消息相关记录较多({info['row_count']:,}条)"
                    recommendation['suggested_action'] = "删除60天前的记录"
            
            # 根据数据年龄调整优先级
            if info['avg_age_days'] > 180:
                if recommendation['priority'] == 'low':
                    recommendation['priority'] = 'medium'
                recommendation['reason'] += f" (数据平均年龄: {info['avg_age_days']:.1f}天)"
            
            # 根据大小调整优先级
            if info['size_bytes'] > 100 * 1024 * 1024:  # > 100MB
                if recommendation['priority'] == 'low':
                    recommendation['priority'] = 'medium'
                elif recommendation['priority'] == 'medium':
                    recommendation['priority'] = 'high'
                recommendation['reason'] += f" (表大小: {self.format_bytes(info['size_bytes'])})"
            
            if recommendation['priority'] != 'low' or info['size_bytes'] > 10 * 1024 * 1024:
                recommendations.append(recommendation)
        
        # 按优先级排序
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        recommendations.sort(key=lambda x: priority_order[x['priority']], reverse=True)
        
        return recommendations
    
    @staticmethod
    def format_bytes(bytes_value: int) -> str:
        """格式化字节数为人类可读格式"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_value < 1024.0:
                return f"{bytes_value:.1f} {unit}"
            bytes_value /= 1024.0
        return f"{bytes_value:.1f} PB"
    
    def generate_cleanup_sql(self, recommendations: List[Dict]) -> str:
        """生成清理SQL脚本"""
        sql_script = "-- Dify 数据库清理脚本\n"
        sql_script += f"-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        sql_script += "-- ⚠️  请在执行前备份数据库！\n\n"
        
        for rec in recommendations:
            if rec['priority'] == 'high':
                table = rec['table']
                sql_script += f"-- {rec['reason']}\n"
                
                if table == 'workflow_runs':
                    sql_script += f"""-- 删除30天前的调试运行记录
DELETE FROM {table} 
WHERE triggered_from = 'debugging' 
  AND created_at < NOW() - INTERVAL '30 days';
  
"""
                elif table == 'workflow_node_executions':
                    sql_script += f"""-- 删除30天前的节点执行记录
DELETE FROM {table} 
WHERE created_at < NOW() - INTERVAL '30 days';
  
"""
                elif table == 'workflow_execution_logs':
                    sql_script += f"""-- 删除7天前的执行日志
DELETE FROM {table} 
WHERE created_at < NOW() - INTERVAL '7 days';
  
"""
                elif table == 'celery_taskmeta':
                    sql_script += f"""-- 删除7天前的Celery任务记录
DELETE FROM {table} 
WHERE date_done < NOW() - INTERVAL '7 days';
  
"""
                
                sql_script += f"-- 预计释放空间: {self.format_bytes(rec['potential_savings'])}\n\n"
        
        sql_script += """-- 清理后重建统计信息
VACUUM ANALYZE;

-- 检查清理效果
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"""
        
        return sql_script
    
    def run_analysis(self, output_format: str = 'console') -> bool:
        """运行完整的数据库分析"""
        if not self.connect():
            return False
        
        try:
            print("🔍 开始数据库分析...")
            
            # 1. 获取表信息
            print("\n📊 获取表大小信息...")
            table_info = self.get_table_info()
            
            # 2. 获取记录数
            print("🔢 统计表记录数...")
            row_counts = self.get_table_row_counts()
            
            # 3. 分析工作流表
            print("⚙️  分析工作流相关表...")
            workflow_analysis = self.analyze_workflow_tables()
            
            # 4. 生成清理建议
            print("💡 生成清理建议...")
            recommendations = self.get_cleanup_recommendations(workflow_analysis)
            
            # 5. 输出结果
            self.print_analysis_report(table_info, row_counts, workflow_analysis, recommendations)
            
            # 6. 生成清理脚本
            if recommendations:
                cleanup_sql = self.generate_cleanup_sql(recommendations)
                with open('database_cleanup.sql', 'w', encoding='utf-8') as f:
                    f.write(cleanup_sql)
                print(f"\n📝 清理SQL脚本已保存到: database_cleanup.sql")
            
            return True
            
        except Exception as e:
            print(f"❌ 分析过程中出错: {e}")
            return False
        finally:
            self.disconnect()
    
    def print_analysis_report(self, table_info: List[Dict], row_counts: Dict[str, int], 
                            workflow_analysis: Dict[str, Dict], recommendations: List[Dict]):
        """打印分析报告"""
        print("\n" + "="*80)
        print("📋 数据库分析报告")
        print("="*80)
        
        # 表大小排行
        print("\n🏆 表大小排行 (前10名):")
        print("-" * 60)
        print(f"{'表名':<30} {'大小':<15} {'记录数':<15}")
        print("-" * 60)
        
        for i, table in enumerate(table_info[:10]):
            table_name = table['tablename']
            row_count = row_counts.get(table_name, 0)
            print(f"{table_name:<30} {table['size']:<15} {row_count:>14,}")
        
        # 工作流表详细分析
        print("\n⚙️  工作流相关表分析:")
        print("-" * 100)
        print(f"{'表名':<30} {'记录数':<12} {'大小':<12} {'最旧记录':<20} {'平均年龄(天)':<12}")
        print("-" * 100)
        
        for table, info in workflow_analysis.items():
            oldest = info['oldest_record'].strftime('%Y-%m-%d') if info['oldest_record'] else 'N/A'
            avg_age = f"{info['avg_age_days']:.1f}" if info['avg_age_days'] > 0 else 'N/A'
            size_str = self.format_bytes(info['size_bytes'])
            
            print(f"{table:<30} {info['row_count']:>11,} {size_str:<12} {oldest:<20} {avg_age:<12}")
        
        # 清理建议
        if recommendations:
            print("\n💡 清理建议:")
            print("-" * 100)
            
            total_savings = 0
            high_priority = [r for r in recommendations if r['priority'] == 'high']
            medium_priority = [r for r in recommendations if r['priority'] == 'medium']
            
            if high_priority:
                print("\n🔴 高优先级 (建议立即清理):")
                for rec in high_priority:
                    print(f"  • {rec['table']}: {rec['reason']}")
                    print(f"    建议: {rec['suggested_action']}")
                    print(f"    预计释放: {self.format_bytes(rec['potential_savings'])}")
                    total_savings += rec['potential_savings']
                    print()
            
            if medium_priority:
                print("🟡 中优先级 (建议定期清理):")
                for rec in medium_priority:
                    print(f"  • {rec['table']}: {rec['reason']}")
                    print(f"    建议: {rec['suggested_action']}")
                    print(f"    预计释放: {self.format_bytes(rec['potential_savings'])}")
                    total_savings += rec['potential_savings']
                    print()
            
            print(f"📈 总计可释放空间: {self.format_bytes(total_savings)}")
        else:
            print("\n✅ 数据库状态良好，暂无需要清理的数据")
        
        print("\n" + "="*80)


def main():
    parser = argparse.ArgumentParser(description='Dify 数据库分析工具')
    parser.add_argument('--host', default='localhost', help='数据库主机地址')
    parser.add_argument('--port', type=int, default=5432, help='数据库端口')
    parser.add_argument('--database', default='dify', help='数据库名称')
    parser.add_argument('--username', default='postgres', help='数据库用户名')
    parser.add_argument('--password', default='difyai123456', help='数据库密码')
    parser.add_argument('--format', choices=['console', 'json'], default='console', help='输出格式')
    
    args = parser.parse_args()
    
    analyzer = DatabaseAnalyzer(
        host=args.host,
        port=args.port,
        database=args.database,
        username=args.username,
        password=args.password
    )
    
    success = analyzer.run_analysis(args.format)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
