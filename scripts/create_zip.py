import os
import zipfile

def make_zip(output_path='/tmp/resona-ai-studio-voice.zip'):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', '.cache') and not d.startswith('.')]
            for f in files:
                if f.endswith('.pyc') or f == 'package-lock.json':
                    continue
                filepath = os.path.join(root, f)
                arcname = os.path.relpath(filepath, '.')
                z.write(filepath, arcname)
    print("ZIP_OK")

if __name__ == '__main__':
    make_zip()
