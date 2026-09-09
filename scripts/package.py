"""Package only the Decky runtime files and public documentation."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', version):
    raise ValueError('Invalid package version')
files = [root / name for name in (
    'dist/index.js', 'package.json', 'plugin.json', 'LICENSE', 'README.md',
    'CHANGELOG.md', 'CONTRIBUTING.md',
)]
files += sorted(path for path in (root / 'assets').rglob('*') if path.is_file())
for path in files:
    if not path.is_file():
        raise FileNotFoundError(path)
output = root / 'out' / f'DeckyGuide-v{version}.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        info = zipfile.ZipInfo('DeckyGuide/' + path.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise ValueError('Archive integrity check failed')
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
print(output)
print(digest)
