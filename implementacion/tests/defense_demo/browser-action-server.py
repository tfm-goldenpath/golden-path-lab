"""Isolated browser fixture: real HTTP/actions/processes, synthetic adapter only.

No Kubernetes. No scenario detection claims. Prints its private loopback URL.
Ctrl-C closes this owned test server; normal laboratory viewers are unaffected.
"""
import json
import os
import signal
import time
from test_action_lifecycle import ActionLifecycleTests

if __name__=='__main__':
    os.environ['GP_DEMO_ACTIONS']='1'
    fixture=ActionLifecycleTests();fixture.setUp()
    launch=fixture.launcher("import time;print('SYNTHETIC harmless readiness adapter — not a laboratory validation',flush=True);print('\\n'.join('Observed test line '+str(i) for i in range(70)),flush=True);time.sleep(5)")
    signal.signal(signal.SIGTERM,lambda *_:(_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        with launch:
            print(json.dumps({'url':fixture.url,'boundary':'Synthetic readiness adapter; no laboratory'}),flush=True)
            while True:time.sleep(.2)
    except KeyboardInterrupt:pass
    finally:fixture.tearDown()
