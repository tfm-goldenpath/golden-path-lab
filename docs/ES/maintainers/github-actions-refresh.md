# Actualización de GitHub Actions — 3 de noviembre de 2026

Rama `chore/github-actions-refresh`, desde main fusionado
`0b2ab83d24b1841e19f9ef52fd956ac7f6ce4ee4` (PR #69).
El [registro EN](../../EN/maintainers/github-actions-refresh.md) conserva la tabla
completa de versiones, SHAs y fuentes oficiales consultadas el 3 de noviembre.
No cambia dependencias de aplicación, pins de herramientas de seguridad,
admisión, conclusiones del benchmark ni la demostración congelada.

## Cambios y compatibilidad

Se actualizan setup-node 7.0.0 → 7.1.0, upload-artifact 7.0.1 → 7.0.2,
upload-pages-artifact 4.0.0 → 5.0.0, configure-pages 5.0.0 → 6.0.0 y
deploy-pages 4.0.5 → 5.0.1, manteniendo referencias completas a commits oficiales.
Checkout 7.0.1, attest 4.2.2 y devcontainers/ci 0.3.1900000450 siguen vigentes y
sin cambios de implementación. Se precisa el comentario de versión del último.
Los tags consultados resuelven directamente a commits; se inspeccionó `action.yml`
en cada commit, además de las notas, requisitos y metadatos disponibles.

Las Actions JavaScript seleccionadas usan Node 24; configure/deploy Pages pasan
de Node 20 a 24. Requieren runner ≥2.327.1; checkout conserva su requisito adicional
≥2.329.0 para operaciones Git autenticadas dentro de Docker actions. El Node de
aplicación/tooling sigue fijado en **24.22.1**: no es el runtime interno de las Actions.
Se mantienen Ubuntu 24.04 alojado, permisos, `persist-credentials: false`, historial
completo donde se exige, timeouts, concurrencia, limpieza y propagación de fallos.

Las tres invocaciones de setup-node declaran `package-manager-cache: false`, sin
entrada `cache`: evita introducir caché automática por futuros cambios de metadatos,
especialmente en entrega privilegiada y mediciones pareadas. La 7.1.0 incorpora
mejoras de resolución/versiones y dependencias; upload-artifact 7.0.2 incorpora el
cliente 6.3.1 con reintentos 429/Retry-After. Configure mantiene `enablement: false`
y deploy conserva `page_url`, con cambios en el sondeo/reintentos.

La dependencia anidada de upload-pages-artifact 5.0.0 sigue siendo
upload-artifact **7.0.0**, SHA `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`,
con cliente artifact `^6.2.0`. Actualizar referencias directas a 7.0.2 no la cambia.
Se conserva el composite oficial y se comprueba su transporte real, sin fork ni
afirmar que todas sus dependencias son las últimas.

Las ocho consultas de avisos públicos por repositorio no devolvieron entradas;
las consultas npm localizaron GHSA-6q32-hq47-5qq3 (artifact 2.0.0–<2.1.2) y
GHSA-9w6v-m7wp-jwg4 (http-client <1.0.8). Los rangos artifact revisados excluyen el
afectado, incluido el cliente API separado `^2.1.8` de deploy-pages. Esto no es una
auditoría transitiva completa ni demuestra ausencia de vulnerabilidades. Se
conservan los 404 de README/package.json en la raíz del tag de distribución de
devcontainers/ci junto con la definición real de la Action.

## Política y empaquetado

La excepción privilegiada de [workflow.rego](../../../implementacion/policies/conftest/workflow.rego)
solo cambia los dos SHAs exactos revisados. Las pruebas siguen rechazando refs
incorrectas/flotantes, pasos arbitrarios, permisos ampliados, variables extra y
bypass de guardas/dependencias. Se conserva ejecución manual desde main, validación
previa, entorno GitHub Pages y prohibición de habilitar Pages. Se usa el parser
Conftest existente, sin añadir PyYAML.

Se descargó el transporte congelado existente y se validó **antes de extraerlo**
con [pages.py](../../../implementacion/scripts/defense-demo/pages.py). Su SHA-256
sigue siendo `deba74a10eb63503cfbe58b1e447f3d1cbb06a2ed9f404ddd0c2519c4cbf7a92`.
Los **541 archivos / 60.567.916 bytes** no tienen componentes ocultos. El tar local
con el comando Linux del composite conserva todos sus hashes y tamaños; se
comprueban rutas y tipos sin extraer el tar resultante. La validación previa
rechaza enlaces/archivos especiales antes de que el composite desreferencie.
`include-hidden-files: false` conserva este sitio y excluye material oculto.
No se regeneró el sitio, el lock, los checksums ni ninguna evidencia histórica.

CI ordinaria añade un smoke sintético de tres archivos y marcadores ocultos
inofensivos, asociado al SHA/run/intento. Usa el composite fijado, sin permisos
Pages ni despliegue. El [helper](../../../implementacion/tests/integration/actions-artifact-smoke.py)
valida ZIP/tar descargado sin extraer, comparando con hashes calculados a partir
de la entrada esperada y la identidad del run elegida externamente. Rechaza
faltantes, extras, corrupción, identidades incorrectas, enlaces y rutas ambiguas.
El artefacto smoke caduca al día; se conservan recibos fuera de Git. La evidencia
estática mantiene sus 14 días y subida `always()`, incluidos fallos.

## Validación y límites

Salidas originales y recibos en
`implementacion/evidence/raw/github-actions-refresh-20261103/`, ignorado por Git.
Las pruebas locales registran SHA base y hashes de archivos modificados; no se
atribuyen a commits posteriores. Entorno inicial: 4 cores, 15 GiB RAM observados,
8,6 GiB libres en workspace y 108 GiB en `/tmp`, sistemas distintos. Se conserva
reserva ≥3 GiB; no hubo builds, clúster, registro, bases de escáner, benchmark ni
instalaciones. Validación local PASS con `PATH="$PWD/implementacion/.tools/bin:$PATH"`:
`doctor`, suite compartida (9 entorno, 1.000 servicio/unitarias, 119 políticas Python,
153 defensa, 22 release, Cosign local, F01/F02 y Rego/Kyverno); 4 pruebas de workflow,
5 de artefactos, 112 contratos alojados/fuente, 16 Lane A y 13 publicación congelada;
Conftest 45/45, inventario exacto de 534 rutas, 10 regresiones de inventario,
160 enlaces locales y `git diff --check`. La comparación estructural conserva todo
lo ajeno a los cambios enumerados. Las regresiones de inputs explícitos fallaron
primero por su ausencia y pasan tras el cambio. El registro EN conserva los
resultados CI y descarga por commit, separados de las comprobaciones locales.

Configure/deploy Pages reales quedan **NOT_EXECUTED**. Tras revisión humana,
merge y autorización separada de publicación:

```bash
gh workflow run demo-pages.yml --repo tfm-goldenpath/golden-path-lab --ref main
```

El comando consulta la configuración existente, sube el sitio verificado y
**publica GitHub Pages**; no habilita Pages. Después, seguir la
[verificación pública](../../../implementacion/docs/ES/defense/github-pages.md).
No requiere crear una release ni reconstruir el sitio; no relajar la guarda main.
No se despacharon golden-path, paired-rg ni lane-a-validation. Attest y el launcher
no cambian: no se atribuye nueva integración OIDC/procedencia o devcontainer.
Las regresiones conservan dos procedencias por digest, emisión solo G, fuentes
restringidas, retirada de credenciales y evidencias fallidas. Cambios futuros de
esas implementaciones exigirían su validación alojada; cualquier comprobación
pareada posterior usaría desarrollo y main exacto, nunca repetir la campaña.

Para revertir, retirar conjuntamente los commits de esta actualización: refs e
inputs de workflows, dos pins de política Pages, smoke y pruebas. Preservar activos
congelados, evidencias y cambios ajenos posteriores. Codex asistió implementación,
pruebas y documentación; revisión humana pendiente. Admisión continúa INCONCLUSIVE
y el piloto sigue sin evidencia suficiente para cambiar la navegación.
