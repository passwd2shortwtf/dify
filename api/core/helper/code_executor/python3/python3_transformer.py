from textwrap import dedent

from core.helper.code_executor.template_transformer import TemplateTransformer


class Python3TemplateTransformer(TemplateTransformer):
    @classmethod
    def get_runner_script(cls) -> str:
        runner_script = dedent(f"""
            # Override built-in print to add auto-flush for real-time logs
            import builtins
            original_print = builtins.print
            def print(*args, **kwargs):
                kwargs.setdefault('flush', True)
                return original_print(*args, **kwargs)
            builtins.print = print

            # declare main function
            {cls._code_placeholder}

            import json
            import sys
            from base64 import b64decode

            # decode and prepare input dict
            inputs_obj = json.loads(b64decode('{cls._inputs_placeholder}').decode('utf-8'))

            # execute main function
            output_obj = main(**inputs_obj)

            # convert output to json and print
            output_json = json.dumps(output_obj, indent=4)
            result = f'''<<RESULT>>{{output_json}}<<RESULT>>'''
            print(result)
            """)
        return runner_script
