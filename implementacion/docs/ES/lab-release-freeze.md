# Congelación de la release de laboratorio (P00)

[Documentación](README.md) · [English y comandos completos](../EN/lab-release-freeze.md) ·
[Especificación](../../releases/lab-freeze.inputs.json) ·
[Validación](../../registros/lab_release_freeze_EN.md) ·
[Notas propuestas](../../releases/lab-release-notes.md)

Se prepara la conservación verificable del laboratorio antes de reorganizar el
repositorio. Esta rama no refactoriza, ejecuta experimentos, actualiza bases,
graba vídeos, despliega Pages ni publica releases. Estado:
**LAB_RELEASE_NOT_YET_VERIFIED**, **REPOSITORY_REFACTOR_BLOCKED**.
El merge de esta implementación no completa P00 ni autoriza la publicación.

## Selección, cobertura y límites

| Material | Clasificación y motivo | Frontera |
|---|---|---|
| Fuente fusionada explícita, herramientas, locks, aceptación y guías | Público obligatorio: `lab-source.tar.gz` creado con `git archive` del SHA completo | Transporte nuevo de código, no experimento nuevo. Se adjuntan snapshots históricos explícitos: runtime 38e7228, renderizador e54eb91, campaña 895a3bd y A corregida 91a33e9. |
| `demo-site-v1.tar.gz` | Público obligatorio: derivado seleccionado existente | Release 416806306, asset 654877193, 541 archivos; HTML/MP4/WebM originales y portable. No es todo frozen-0002. Se conservan sitio, lock y workflow de Pages. |
| `freeze-20261018t205939z/frozen-0002` exacto | Custodia privada obligatoria, excluida de subida pública | Carpeta existente bajo `implementacion/evidence/packages/defense-freeze-20261018t205939z/`; cinco anclas históricas, SHA256SUMS completo y manifiestos. Grabación/validación y archivo completo siguen privados. Custodia/hash de la copia descargada confirmados por el propietario el 24 de octubre; destino privado no divulgado y sin inspección independiente de esa copia. |
| Archivo de campaña `campaign-evidence-895a3bd-20261004.tar.gz` | Público obligatorio | Release 403052949, asset 609973571; 1.412.065.509 bytes. Inventario FILES.sha256 de 3.424 miembros; diez pares, desarrollo, bases y fallo/corrección de revisión. |
| report/analysis, dos README de publicación y dos ficheros de sumas | Públicos obligatorios para restaurar | v2 corrige la creación de `originals/`; se conserva v1 y el fallo original. |
| `lane-a-catalogue-37342413975-fix-b0d330e.zip` | Público obligatorio: observación desfavorable | Asset 613292923, fuente 895a3bd, intento 1: fallo en shared-tests; veinte escenarios NOT_EXECUTED. |
| `lane-a-37353632299-91a33e9-evidence-v2.zip` | Público obligatorio: fuente corregida | Asset 613384625, fuente 91a33e9, intento 1. Vía A con clave local aun en GitHub; v2 corrige nombre documental de F04. |
| v0.1.0/v0.2.0, lane-A v1, frozen-0001 y exportaciones/vídeos anteriores | Referencias históricas | No se eliminan ni sustituyen; releases académicas sin assets adjuntos. |
| A1/A2/B1, seis reparaciones AR y piloto de cuatro pares P | Referencias históricas con registros versionados | No nueva auditoría/recuperación. Original A2 no retenido aquí; descargas locales P eliminadas históricamente y copia externa sin verificar. |
| ZIP de recursos económicos del 05/10 | Suplemento opcional, en release original | Asset 613456873; no se selecciona para nueva subida ni acredita productividad. |
| Claves, credenciales, kubeconfigs, otras sesiones y ficheros ignorados no seleccionados | Privados/excluidos | No se publican automáticamente. Blobs de caché omitidos históricamente no se pueden restaurar. |

La especificación contiene IDs, ubicaciones, tamaños, hashes y anclas. Los públicos
seleccionados suman aproximadamente 1,69 GB; el congelado privado, 81.988.946 bytes.
El subconjunto Pages no reconstruye el original completo. El 24 de octubre de 2026
el propietario confirmó custodia y verificación de hash de su copia descargada de
frozen-0002. Es una declaración humana separada de nuestras comprobaciones locales;
el destino privado no se divulga. No acredita custodia de todo el expediente
histórico de evaluación. La especificación recoge este alcance sin alterar originales.

La [declaración canónica del 4 de octubre](../../registros/evaluation_acceptance_20261004_ES.md)
cierra la evaluación con alcance reducido. Los textos históricos de campaña que
decían aceptación pendiente no se reescriben: la declaración posterior explica
la decisión. La revisión humana de A3/A4 posteriores sigue pendiente.

Se distinguen A/clave local de B/OIDC, R/referencia de G/controles, ensayos
funcionales, reparaciones guionizadas, piloto de cuatro pares y campaña de diez.
Positivos compartidos no son muestras independientes; rechazo de política no es
fallo de registro, transporte o verificación. Negativos alojados no soportados
siguen NOT_EXECUTED y medición del esfuerzo humano queda aplazada.

La demo ejecutó en 38e7228, conservando su dirty status original; el renderizador
corresponde a e54eb91, capturado antes del commit como 38e7228 con cambios.
**DEMO_VALID_ACCEPT es recuperación F13 con el mismo digest, no L01 completo.**
L01 histórico pertenece a 37353632299, con fuente y digests principal/reemplazo
propios. Perfiles, imágenes, DB y resultados conservan sus manifiestos originales.
El SHA de release nunca sustituye la fuente experimental.

## Recuperación y verificación

Use código del repositorio revisado, nunca scripts del archivo recuperado.
Antes de descargar/copiar/verificar, revise `nproc`, `free -h`, `df -h`, `df -i`
y `docker system df` cuando sea accesible. Se mantienen 3 GiB más crecimiento
proyectado y 10.000 inodos más los necesarios en el **destino real**. Cada copia de
inputs/candidato/descarga requiere unos 1,7 GB, más hasta 512 MiB temporales para
la demo. `/tmp` era otro filesystem con 108 GiB libres: compruébelo de nuevo.
No pode Docker ni borre evidencias para obtener espacio.

```bash
set -euo pipefail
export GH_REPO=tfm-goldenpath/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
df -h /workspaces /tmp
df -i /workspaces /tmp
WORK=$(mktemp -d /tmp/lab-release-custody.XXXXXX)
CLI="$PWD/implementacion/scripts/lab-release.py"
python3 "$CLI" recover "$WORK/inputs" --receipt "$WORK/recovery.json"
python3 "$CLI" inventory "$WORK/inputs" > "$WORK/inventory.json"
FROZEN="$PWD/implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002"
python3 implementacion/scripts/defense-demo/pages.py verify-frozen "$FROZEN"
python3 implementacion/scripts/defense-demo/pages.py unpack \
  "$WORK/inputs/demo-site-v1.tar.gz" "$WORK/site"
python3 implementacion/scripts/defense-demo/pages.py verify-site "$WORK/site"
node implementacion/tests/defense_demo/static-export-check.mjs \
  "$WORK/site" "$WORK/browser" site
```

Abra recorded.html con file:// o sirva `$WORK/site` por HTTP estático y abra
`/demo/`. El test comprueba prefijo de repositorio, logs/atribución F11/F13 y
casos tempranos, inventarios F13, L01 histórico, geometría, descargas, acciones
inactivas y errores explícitos por original ausente/corrupto. Los informes y
copias alteradas de prueba quedan fuera del original. El enlace HTML al archivo
completo requiere el evidence.tar.gz privado. La demo portable sirve los originales
seleccionados. El vídeo original silencioso permanece incluido, sin audio ni
narración. Por indicación del propietario, reproducción en el equipo de presentación,
decodificación y narración quedan fuera de esta tarea; los bytes siguen intactos.

Destinos existentes, cambios de identidad/hash, rutas inseguras, enlaces, especiales,
duplicados, colisiones, límites e inventarios incorrectos provocan error. Una
interrupción conserva parciales: reintente en destino nuevo. No se regeneran
experimentos ni se reescriben manifiestos. Solo se eliminan temporales de verificación
creados y poseídos por la tarea. Los archivos grandes se inspeccionan por streaming;
los archivos anidados conservan bytes autenticados por el inventario exterior,
sin repetir criptografía o restaurar DB. Escaneo acotado de credenciales sobre
texto seleccionado; contenido anidado conserva auditorías publicadas y rutas
históricas conocidas. No es garantía universal de privacidad. Una derivación
sanitizada necesitaría identidad y revisión propias.

## Tras revisión y merge

Siga los [bloques completos de comandos EN](../EN/lab-release-freeze.md#post-merge-checklist-and-exact-source-preparation),
que son la receta compartida para ambos idiomas. Resuelven el PR fusionado y su
mergeCommit, comprueban pertenencia a main, especificación/herramientas revisadas,
CI exacta y checks obligatorios/rulesets. Crean un worktree nuevo en el SHA
explícito, ejecutan doctor/test y generan el manifiesto final sin circularidad.
Las consultas administrativas usan la sesión guardada de gh, omitiendo GH_TOKEN y
GITHUB_TOKEN. Solo el 404 exacto «Branch not protected» acredita ausencia de
protección clásica; se consultan además los rulesets activos. Un 403 u otro error
inesperado detiene el procedimiento; el 404 clásico no equivale a CI favorable.

- [ ] Herramientas y preparación revisadas.
- [ ] Originales públicos y custodia privada verificados; ubicación externa y responsable registrados sin credenciales.
- [ ] Candidato y pruebas offline revisados, con límites.
- [ ] Fuente fusionada exacta, ascendencia main y checks obligatorios confirmados.
- [ ] Hash del manifiesto final y lista explícita revisados independientemente.
- [ ] Draft autorizado, todos los assets adjuntos y descarga del draft verificada.
- [ ] Publicación explícitamente autorizada y realizada una vez.
- [ ] Tag y bytes publicados descargados y verificados independientemente; atestaciones cuando existan.
- [ ] Límites/custodia/revisión humana registrados y preparación para refactor decidida aparte.

Nombre provisional el 24/10: `lab-v2026.10.24`; use fecha UTC real de publicación y
compruebe colisiones. Título: `Golden Path Lab — frozen research and demonstration baseline`.
Mantenga `--latest=false`. Un draft/tag existente exige revisión deliberada: nunca
`--clobber`, sustitución automática o force-push. Crear/publicar requiere autorización
separada; implementar o fusionar este PR no la concede.

El gh instalado 2.102.0 admite create/upload/edit/verify/verify-asset. El 403 inicial
quedó resuelto el 24 de octubre mediante la autenticación de usuario guardada en gh:
`enabled=false`, `enforced_by_owner=false`. Protección clásica: 404 «Branch not
protected». Ruleset activo 24047874: borrado/force-push/PR, cero aprobaciones exigidas
y ninguna regla de checks obligatorios devuelta. No se cambió configuración;
compruébela de nuevo antes de publicar. Activar inmutabilidad sigue siendo una
decisión separada. Si está habilitada, la protección se aplica tras publicar:
todos los assets deben adjuntarse
antes. Se usa la lista explícita del manifiesto, nunca un glob de directorio.

Los comandos EN usan `download-verify --draft` antes de publicar y otra descarga
nueva sin `--draft` después. Comprueban objeto real del tag (incluidos anotados),
inventario exacto, bytes y archivo fuente contra el commit. Con immutable=true
se exige `gh release verify` y `verify-asset` para cada adjunto; un fallo no se
rebaja a aviso. Sin atestaciones inmutables se declara criptografía no disponible,
conservando la verificación por anclas independientes. Los archivos fuente
generados automáticamente por GitHub no admiten verify-asset; el adjunto explícito
lab-source.tar.gz sí pertenece al inventario deliberado.

El manifiesto no se hashea a sí mismo: RELEASE-SHA256SUMS.txt enlaza assets y
manifiesto; su hash revisado se conserva aparte. Los informes posteriores permanecen
fuera de la release inmutable. PUBLISHED_BYTES_VERIFIED no acredita custodia externa
ni aceptación humana. Solo tras todas las puertas satisfechas, un informe separado
revisado podrá declarar LAB_RELEASE_VERIFIED / READY_FOR_PRODUCT_FOUNDATION.
Hasta entonces: LAB_RELEASE_NOT_YET_VERIFIED / REPOSITORY_REFACTOR_BLOCKED.
Ningún estado inicia automáticamente otra rama.
