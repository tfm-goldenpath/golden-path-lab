# F01 / F02: ficha operativa de políticas de workflows

Oráculo definido antes de implementar sobre main
`d66d2237ab384069ed7f2fac7514fe11daba259b`, a partir de los requisitos explícitos
de esta tarea y `workflow.rego`. Se conservan los IDs académicos. No se crea otro
catálogo ni se afirma haber revisado una nueva versión de la tesis. Revisión
humana y aceptación pendientes. [Ficha principal en inglés](../../../EN/cases/F01-F02/record.md).

| Propiedad | L01: aceptación de workflow | F01 | F02 |
|---|---|---|---|
| Original | Workflow manual inerte; checkout con SHA completo y permisos de escritura limitados al job | Mismo original aceptado | Mismo original aceptado |
| Actor | Preparación de laboratorio | Colaborador que propone cambios de workflow; sin modificar evaluador ni política confiables | Igual; sin modificar tags externos |
| Alteración exacta | Ninguna | workflow_dispatch pasa a pull_request_target y checkout recibe ref `${{ github.event.pull_request.head.sha }}` | Solo el SHA de checkout pasa a v7.0.1 |
| Regla | Ninguna denegación | PULL_REQUEST_TARGET | ACTION_SHA |
| Diagnóstico exclusivo | Vacío | `PULL_REQUEST_TARGET: this event is excluded from the laboratory` | `ACTION_SHA: actions/checkout@v7.0.1 must be pinned to a full 40-character SHA` |
| Inyección/primer consumidor | Evaluación estática Conftest | Workflow propuesto antes del control de PR | Igual |
| Última barrera | Aceptación estática | Fallo del control de PR antes del merge/ejecución protegida | Igual |

F01 combina contenido de un PR externo con ejecución privilegiada: checkout del
head y un comando que ejecutaría código del repositorio. Actions conservan SHA y
permisos permitidos para aislar el evento. La prohibición conservadora no analiza
flujos arbitrarios de datos no confiables ni demuestra un compromiso real.
Ninguna entrada se activa o ejecuta en R/G; comandos y expresiones son datos.
Todas permanecen fuera de `.github/workflows/`.

Se conservan entradas, diffs, hashes SHA-256, política y hash, versión y hash del
binario, revisión, argv, estado de salida, stdout/stderr y clasificación. No hay
digest de imagen. Errores YAML, de herramienta, compilación, timeout o formato de
salida, aceptación inesperada y denegaciones adicionales son fallos del ensayo.

Las reglas del repositorio y CI confiable imponen requisitos de merge fuera de
estos archivos. Los tests no configuran protecciones ni impiden que una propuesta
modifique sus controles. Se siguen validando los workflows reales por separado.
L01 aquí solo cubre aceptación de workflow. No es una entrega completa ni una
medición de campaña. Las brechas F09/F10/L05 y F13/F14 siguen abiertas.
Estado inicial: **NOT_EXECUTED**. Véase el [registro de validación](../../../../registros/f01_f02_workflows_ES.md).
