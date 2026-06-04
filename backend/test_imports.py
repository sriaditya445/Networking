import os
import sys
import importlib.util

def check_imports(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py') and file != '__init__.py':
                module_name = os.path.splitext(file)[0]
                file_path = os.path.join(root, file)
                try:
                    spec = importlib.util.spec_from_file_location(module_name, file_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                except Exception as e:
                    print(f"Error importing {file_path}: {e}")

sys.path.append('/home/anvitha/github/Networking/backend')
check_imports('/home/anvitha/github/Networking/backend/app')
