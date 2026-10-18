"""Defense guide relocation and compatibility links, without network access."""
from pathlib import Path
import re
import unittest
from urllib.parse import unquote
import test_core

REPO=Path(__file__).resolve().parents[3]
NAMES=('defense-demo.md','defense-demo-operations.md','demo-workspace.md','f11-comparison.md')

def anchors(text):
    values=set(re.findall(r'<a id="([^"]+)"',text));seen={};fence=False
    for line in text.splitlines():
        if line.startswith('```'):fence=not fence
        if fence:continue
        if re.match(r'^#{1,6} ',line):
            slug=re.sub(r'[^\w\- ]','',line.lstrip('# ').strip().lower()).replace(' ','-')
            count=seen.get(slug,0);seen[slug]=count+1;values.add(slug+('-'+str(count) if count else ''))
    return values

class DefenseDocumentationTests(unittest.TestCase):
    def test_canonical_guides_and_compatibility_anchors(self):
        for lang in ('EN','ES'):
            parent=REPO/'implementacion/docs'/lang
            for name in NAMES:
                old=(parent/name).read_text();new=(parent/'defense'/name).read_text()
                self.assertLess(len(old),len(new));self.assertIn('defense/'+name,old)
                for anchor in re.findall(r'<a id="([^"]+)"',old):self.assertIn(anchor,anchors(new),name+'#'+anchor)
    def test_relative_document_links_and_anchors(self):
        docs=[REPO/'README.md',REPO/'implementacion/TODO.md']
        for lang in ('EN','ES'):
            docs += list((REPO/'implementacion/docs'/lang/'defense').glob('*.md'))
            docs += [REPO/'implementacion/docs'/lang/'README.md',REPO/'implementacion/docs'/lang/'architecture.md']
        for document in docs:
            for raw in re.findall(r'\]\(([^)]+)\)',document.read_text()):
                if raw.startswith(('http:','https:','mailto:')):continue
                target,_,anchor=unquote(raw).partition('#');path=(document.parent/target).resolve() if target else document
                self.assertTrue(path.exists(),str(document)+': '+raw)
                if anchor and path.suffix=='.md':self.assertIn(anchor,anchors(path.read_text()),str(document)+': '+raw)

if __name__=='__main__':unittest.main()
