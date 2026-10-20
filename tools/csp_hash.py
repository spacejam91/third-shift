# Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
"""Print the CSP hash of each inline <script> in site/index.html, for the script-src line in site/_headers."""

import base64
import hashlib
import os
import re

page = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "index.html")
with open(page, encoding="utf-8") as fh:
    html = fh.read()

for body in re.findall(r"<script>(.*?)</script>", html, re.S):
    digest = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode()
    print(f"'sha256-{digest}'  <-  {body.strip()[:60]}")
