# Ejecución y evidencias F11/F12/L06

Desde la raíz, en el devcontainer con versiones fijadas:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion doctor
```

Detenerse si falla un requisito. Tras doctor, ejecutar
`make -C implementacion smoke-env` y la prueba acotada de conectividad
BuildKit en kind indicada al final de la [guía compartida](../../../EN/cases/F09-F10-L05/runbook.md).
Solo si pasan los requisitos:

```bash
make -C implementacion demo
```

No se cambian red del host ni versiones. L05 sigue sin ejecutarse si no se
proporciona su pareja explícita de revisiones. Las brechas F09/F10/L05 y F13/F14
requieren sus propias evidencias y permanecen abiertas.

Para hosted, el responsable debe autorizar previamente la publicación de la
revisión revisada y el despacho manual. Cuando la rama exista en remoto:

```bash
gh workflow run golden-path.yml --repo tfm-goldenpath/golden-path-lab \
  --ref test/f11-f12-l06-runtime
gh run list --repo tfm-goldenpath/golden-path-lab --workflow golden-path.yml \
  --branch test/f11-f12-l06-runtime --limit 1
```

Registrar ID/SHA exactos y descargar con
`gh run download RUN_ID --repo tfm-goldenpath/golden-path-lab`.
Se conserva prepare → atestaciones nativas → finish → cleanup. El tag se restaura
desde estado, sin depender de variables entre procesos ni nuevos permisos GHCR.
No se publicó ni despachó nada durante esta tarea.

Evidencia: `evidence/raw/run-*/runtime/`, registros F11/F12-completed y L06-result,
versiones y verificación criptográfica `runtime-authorized.*` en el directorio
principal. El paquete incluye entradas/diffs, respuestas crudas, atribución,
resolución del tag, observaciones de estado, rollout, HTTP y limpieza. Excluye
estado privado y credenciales. NOT_EXECUTED e INCOMPLETE no significan aceptación.

Pruebas de desarrollo: `evidence/raw/runtime-development/`. Admisión real local y
hosted: **NOT_EXECUTED**. Doctor detectó kubectl v1.37.0 frente a v1.35.8 fijado;
no se alcanzaron smoke, conectividad ni demo. El bloqueo previo de red no se
considera resuelto. El usuario informa éxito hosted `36750845686` en `d864654`;
no se auditó aquí su paquete ni se usa para cerrar escenarios omitidos.

Asistencia: Codex (GPT-6; snapshot exacto no disponible), código, pruebas y
redacción. Revisión humana y decisión final: pendientes. Detalle y propuesta de
PR en la [guía inglesa](../../../EN/cases/F11-F12-L06/runbook.md).


## Resultados de esta revisión local

Suite compartida PASS: 6 pruebas de entorno, 759 de servicio/unidad, 43 Python,
56 decisiones Conftest, 16 comprobaciones Kyverno, criptografía Cosign local real
y ensayos estáticos F01/F02. Regresión final de clasificadores, familia y paquetes:
132/132 PASS. Sintaxis Bash, diff y 23 enlaces de la familia: PASS.
`doctor` falla en kubectl; admisión local/hosted NOT_EXECUTED.

Logs finales: `14-final-suite.log`, `15-final-targeted.log`; versiones:
`16-tool-versions.json`. Lista de archivos y hashes: `changed-files.txt` y
`source-hashes.txt`, bajo `evidence/raw/runtime-development/`.
Cambios sin commit sobre `d86465410d74e39ef8e77a9979995bcb268abf9a`.
