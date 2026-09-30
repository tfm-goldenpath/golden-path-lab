# Validación estática F01 / F02

Fecha: 2026-09-30. Rama `test/f01-f02-workflows`. Base:
`d66d2237ab384069ed7f2fac7514fe11daba259b`, más cambios locales sin commit
identificados por hashes en la evidencia. Revisión humana y aceptación pendientes.
[Ficha](../docs/ES/cases/F01-F02/record.md) · [Comandos](../docs/ES/cases/F01-F02/runbook.md).

Conftest real 0.70.1 / OPA 1.20.2 aceptó el original L01 y rechazó F01 solo por
PULL_REQUEST_TARGET y F02 solo por ACTION_SHA. Códigos 0, 1 y 1; stderr vacío.
El comando de escenarios devolvió 0 tras comparar los diagnósticos estructurados
exactos. L01 aquí solo significa aceptación de workflow, no entrega completa.
No se ejecutó ninguna Action, comando candidato, clúster o entrega.

El primer ensayo F01 aceptó inesperadamente `on:` sin comillas: el parser lo
representa como `true`. Los fixtures JSON previos no cubrían ese camino. La
política ahora consulta ambas formas y los eventos mapa/lista/cadena. Se mantiene
la prohibición y el alcance de referencias. `first-trial/` conserva ese resultado
adverso y los logs intermedios conservan los fallos de regresión.

## Comprobaciones observadas

Evidencia en `implementacion/evidence/raw/f01-f02/`:

- `01-red.log`: fallo inicial por ausencia del evaluador nuevo.
- `02-focused.log` a `05-focused.log`: brecha del parser y error de preparación de
  un test encontrados y corregidos.
- `08-focused.log`: 10/10 regresiones, Conftest real y respuestas sintéticas
  explícitamente identificadas para procesos/clasificador.
- `06-suite.log`: suite fallida en sandbox; `12-sandbox-socket.log` confirma EPERM
  al abrir socket local.
- `07-suite-unrestricted.log`: suite completa con exit 0 y acceso a sockets
  locales: 6 de entorno, 733 servicio/unitarias, 42 Python, 52/52 Conftest,
  9/9 Kyverno, archivos reales 18/18 y 14/14, todas las pruebas Cosign offline y
  ensayo estático PASS.
- `09-final-policies.log`: tras cambios finales en regresiones/CI, 43 Python
  (incluidas las 10 de workflows), 52/52 Conftest, 9/9 Kyverno, workflows reales
  18/18 y manifiesto 14/14. Exit 0.
- `10-static.log` y `final-static-trial/`: L01 ACCEPT y F01/F02 DENY exclusivo;
  resultado agregado PASS.
- `11-archive-audit.json`: checksum del archivo y 20 hashes internos verificados,
  alcance estático y estados comprobados.

El recuento Python incluye pruebas renderer duplicadas por el descubrimiento
existente. La suite completa precede a la última regresión de propagación de fallo
en Make; la suite afectada final sí la incluye. No son recuentos de escenarios ni
mediciones. No hubo incidencias de red en los tests estáticos. EPERM de sockets no
es el bloqueo histórico DNS de BuildKit; no se cambió red ni versiones.

El ensayo conserva YAML original/alterado, diffs, política, hashes, versión/hash
del binario, hashes de implementación, revisión/estado local, argv, estados de
salida, diagnósticos crudos y resultados estructurados. Las entradas siguen
inertes fuera de workflows activos; no corresponde digest de imagen.
Paquete: `implementacion/evidence/packages/f01-f02/final-static-trial.tar.gz`.
SHA-256: `bca8bd62b5bb2835eb5c2b9cacdfe4b68d922b96555cb192dc365f84d9bdb36a`.
Evidencia cruda y paquete están ignorados por Git.

## Límites y asistencia

CI ordinario queda conectado, pero no se ejecutó remotamente este cambio. Se
siguen evaluando los workflows reales. CI confiable y rulesets externos imponen
el merge; estos tests no protegen sus propios controles. F01 no es análisis general
de flujo ni compromiso real; F02 no ejecuta Actions ni modifica tags externos.

El contexto aportado por el usuario indica éxito hosted `36746422169` en
`d66d223`; aquí no se auditó su paquete. Los negativos hosted F13/F14 fueron
omitidos. Las brechas F09/F10/L05 y F13/F14 permanecen abiertas. No hubo integración
de entrega nueva, campaña, push, PR, dispatch remoto, cambio de settings o release.

| Actividad | Asistencia y herramienta/modelo | Revisión humana | Decisión |
|---|---|---|---|
| Oráculo, evaluador, escenarios, corrección de parser, regresiones, auditoría y documentación EN/ES | Github Copilot, GPT-6 | Pendiente | Pendiente |
