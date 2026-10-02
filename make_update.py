# -*- coding: utf-8 -*-
"""生成热更新包：把网页层资产打成 update/update-bundle-vX.zip，
并在站点根目录写 version.json。电脑上的 启动服务器.bat 直接就能提供这两个文件。
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))   # biancheng-app/
VERSION = '0.3'
CODE = 3
ITEMS = ['index.html', 'manifest.json', 'css', 'js', 'vendor', 'icons']

UP = os.path.join(ROOT, 'update')
os.makedirs(UP, exist_ok=True)
zpath = os.path.join(UP, 'update-bundle-v%s.zip' % VERSION)

with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for item in ITEMS:
        p = os.path.join(ROOT, item)
        if os.path.isdir(p):
            for dp, _dirs, files in os.walk(p):
                for f in files:
                    fp = os.path.join(dp, f)
                    z.write(fp, os.path.relpath(fp, ROOT))
        else:
            z.write(p, item)

with open(os.path.join(ROOT, 'version.json'), 'w', encoding='utf-8') as f:
    json.dump({'version': VERSION, 'code': CODE,
               'bundle': 'update/update-bundle-v%s.zip' % VERSION},
              f, ensure_ascii=False, indent=2)

print('更新包: %s (%.1f MB)' % (zpath, os.path.getsize(zpath) / 1048576))
print('version.json 已写入站点根目录，手机端「检查更新」即可拉到 v%s' % VERSION)
