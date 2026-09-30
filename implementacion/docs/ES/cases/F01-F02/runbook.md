# Ensayos estáticos F01 / F02

Véanse la [ficha](record.md) y el [registro](../../../../registros/f01_f02_workflows_ES.md).
Desde la raíz, en devcontainer/Codespaces:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test-workflows
make -C implementacion test-workflows WORKFLOW_EVIDENCE=evidence/raw/workflow-review
python3 -m unittest discover -s implementacion/tests/policies -p test_workflow_scenarios.py
make -C implementacion test
```

El directorio nombrado debe ser nuevo. `test-workflows` requiere Python 3, Git y
Conftest 0.70.1 fijado; comprueba esa versión sin Docker, kubectl, GHCR, firmas ni
OIDC. No necesita `doctor`. La suite compartida mantiene sus otros requisitos,
incluidos sockets HTTP locales.

La misma política y el mismo evaluador deben aceptar L01 y rechazar F01/F02 solo
por los diagnósticos previstos. El parser YAML fijado convierte `on` sin comillas
en `true`; la política contempla ambas claves. No cambia el alcance de referencias
externas, workflows reutilizables ni la excepción local `./`.

Se retienen `result.json`, `*-evaluation.json`, stdout/stderr, `tool.json`,
`hashes.json`, entradas `.yaml`, `*-diff.txt` y `workflow.rego.txt`. No se ejecutan
comandos ni expresiones de las entradas. Fallos de herramienta, YAML, compilación,
timeout, salida inválida, aceptación inesperada o denegaciones adicionales no
son detecciones. Un fallo conserva evidencia parcial y no sobrescribe intentos.

```bash
python3 implementacion/scripts/package-evidence.py \
  implementacion/evidence/raw/workflow-review \
  implementacion/evidence/packages/workflows PASS
# Para un intento fallido, conservarlo con estado FAIL.
```

El paquete conserva resumen de alcance, hashes internos y checksum externo.
L01 significa solo aceptación de workflow. Evidencia cruda y paquetes quedan
fuera de Git. CI ordinario ejecuta los ensayos mediante `make test`, sigue
validando los workflows reales con `check-policies.sh` y sube la evidencia
estática con una Action fijada. Evidencia ausente indica fase no alcanzada.
Rechazar correctamente un fixture hace pasar el ensayo; presentar ese workflow
inválido al control normal hace fallar el control. CI confiable y reglas externas
del repositorio imponen el merge; los tests no configuran esas protecciones ni
impiden que un candidato modifique sus controles.

Nunca instalar las entradas en `.github/workflows/`, despacharlas, cargarlas con
source o ejecutarlas en R/G. F01 no prueba compromiso ni análisis general de flujo
no confiable; F02 no ejecuta Actions ni modifica tags externos. Observaciones
estáticas, regresiones, integración de entrega y mediciones de campaña permanecen
separadas. Las brechas de integración F09/F10/L05 y F13/F14 siguen abiertas.
