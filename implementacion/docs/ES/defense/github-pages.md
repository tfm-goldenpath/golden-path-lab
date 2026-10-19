# Publicar la defensa registrada y verificada

[Índice de defensa](README.md) · [English](../../EN/defense/github-pages.md)

Se publica **portable/ del paquete congelado existente**, no el código de
`implementacion/demo/`. Abrir o publicar no ejecuta el laboratorio ni añade una
muestra experimental. Se conservan sesión, fuente y renderizador originales.
La recuperación F13 usa el mismo digest (DEMO_VALID_ACCEPT); el L01 histórico
con reemplazo tiene su contexto separado. Vía A alojada no equivale a OIDC B.
Comprobar integridad no vuelve a verificar firmas. Ensayo humano narrado pendiente.

## Recuperación y comprobación

La copia auténtica está en este Codespace:

```bash
export FROZEN_DIR="$PWD/implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002"
python3 implementacion/scripts/defense-demo/pages.py verify-frozen "$FROZEN_DIR"
```

Usa código del **repositorio revisado**, no ejecutes el verificador de una descarga
aún no autenticada. Se contrastan las cinco anclas del [registro histórico](../../../registros/demo_static_freeze_EN.md), ambos SHA256SUMS y todos los miembros del
archivo autenticado. Se compara el conjunto exacto de portable, tamaños y hashes,
incluido su SHA256SUMS. Recalcular ese inventario no autoriza bytes diferentes.
También se comprueban selección, sesión, fuente y renderizador. No se reescriben
los manifiestos ni se regenera contenido ausente.

Git no recupera evidencia ignorada. Si falta, identifica el Codespace con
`gh codespace list`, consulta `gh codespace cp --help` y copia la ruta explícita
a un destino nuevo. Registra origen, fecha, tamaño y destino. No uses “latest”,
frozen-0001, otra sesión ni un montaje de capturas de Windows como sustituto.

## Qué contiene el sitio

Lock versionado: `implementacion/demo/pages-source.lock.json`.
Staging: `implementacion/evidence/packages/demo-site-v1/`.
Transporte: `implementacion/evidence/packages/demo-site-v1.tar.gz`.

`demo/` conserva portable byte a byte. Se añaden únicamente portada, manifiesto
de publicación y respaldos originales recorded.html, video.mp4 y original.webm.
No se publican evidence.tar.gz completo, freeze/validation/recording, credenciales,
bases, snapshots ni otras sesiones. Las evidencias seleccionadas conservan su
procedencia aunque compartan una copia por hash.

El HTML descargado conserva el enlace original a evidence.tar.gz: **ese paquete
no está en Pages**; necesita la copia privada al lado del HTML. Para originales
completos seleccionados, usa la demo portable; para respaldo completo sin red,
conserva la carpeta congelada original. La portada explica esta limitación sin
modificar los bytes revisados. Logs esenciales pequeños están completos en el HTML.

El manifiesto de publicación inventaría todos los demás archivos. El lock fija
el hash del propio manifiesto, sin intentar un hash circular. Distingue commit y
hashes de herramientas de publicación de las fuentes históricas de las evidencias.

```bash
python3 implementacion/scripts/defense-demo/pages.py verify-site implementacion/evidence/packages/demo-site-v1
# Destino NUEVO: no sobrescribe archivos existentes.
python3 implementacion/scripts/defense-demo/pages.py unpack \
  implementacion/evidence/packages/demo-site-v1.tar.gz \
  implementacion/evidence/packages/demo-site-restored
python3 -m http.server 8000 --bind 127.0.0.1 \
  --directory implementacion/evidence/packages/demo-site-restored
```

Abre `http://127.0.0.1:8000/demo/#demo?focus=defense`, con puerto privado.
Funciona también bajo `/golden-path-lab/demo/`. Se limitan archivos (12.000),
tamaño por archivo (64 MiB) y total (512 MiB). Se rechazan enlaces, rutas inseguras,
duplicados, archivos ausentes/adicionales y hashes distintos. Se exige reserva de
3 GiB más crecimiento estimado y 10.000 inodos más los proyectados. Sin podas globales.

No repitas `stage`, exportación, congelación ni laboratorio para publicar. Se usa
el transporte ya comprobado. Otra selección requiere otro lock revisado y nueva
identidad de asset, sin sobrescribir la anterior.

## Publicación explícita después del merge

**No ejecutado por esta PR.** Desde main actualizado, comprueba primero que no
existe la release técnica con `gh release view demo-site-freeze-20261018-v1`.
Si existe, detente; no uses `--clobber` ni modifiques releases académicas v0.x.

```bash
export GH_REPO=tfm-goldenpath/golden-path-lab
export SITE_ARCHIVE="$PWD/implementacion/evidence/packages/demo-site-v1.tar.gz"
python3 implementacion/scripts/defense-demo/pages.py verify-site implementacion/evidence/packages/demo-site-v1
gh release create demo-site-freeze-20261018-v1 "$SITE_ARCHIVE" \
  --repo "$GH_REPO" --target main --latest=false \
  --title 'Recorded demo transport: freeze-20261018t205939z v1' \
  --notes 'Technical transport only. Historical evidence; no new laboratory run. See pages-source.lock.json and publication-manifest.json.'
python3 implementacion/scripts/defense-demo/pages.py fetch implementacion/evidence/packages/pages-redownload-v1
python3 implementacion/scripts/defense-demo/pages.py unpack \
  implementacion/evidence/packages/pages-redownload-v1/demo-site-v1.tar.gz \
  implementacion/evidence/packages/pages-verified-v1
```

`fetch` comprueba tag explícito, nombre único, tamaño y SHA antes de extraer.
Imprime IDs reales de release/asset para conservarlos. Una etiqueta por sí sola
no autentica contenido. La carga es un paso posterior autorizado por el operador.

Una persona con permisos de administración debe revisar **Settings → Pages →
Build and deployment → Source: GitHub Actions**, y limitar el environment
`github-pages` a main. La consulta local recibió 404 tanto en API como en URL;
no presupone permisos ni configura Pages. Revisa de nuevo antes de desplegar:
**el artifact sustituye el sitio entero**, no solo `/demo/`. Si aparece contenido
ajeno, detén la publicación y acuerda cómo conservarlo. No hacen falta PAT ni
permisos nuevos de organización.

```bash
gh workflow run demo-pages.yml --repo "$GH_REPO" --ref main
gh run list --repo "$GH_REPO" --workflow demo-pages.yml --event workflow_dispatch --limit 5
read -r -p 'ID confirmado del run de publicación: ' PAGES_RUN_ID
gh run watch "$PAGES_RUN_ID" --repo "$GH_REPO" --exit-status
gh run view "$PAGES_RUN_ID" --repo "$GH_REPO" --json url,headSha,status,conclusion
gh api repos/tfm-goldenpath/golden-path-lab/pages --jq .html_url
```

Identifica tu invocación por actor, SHA y fecha; no copies automáticamente el último
run de otra persona. URL prevista: `https://tfm-goldenpath.github.io/golden-path-lab/demo/`;
confirma la real en la salida de Pages. El workflow es manual, solo main, valida
antes de subir staging y despliega mediante `needs`. Solo el job de despliegue tiene
pages/id-token write, con acciones oficiales fijadas a SHA comprobados.

## Comprobación pública y recuperación

Después del despliegue, compara el hash del publication-manifest.json descargado
con `manifestSha256` del lock. Descarga sus archivos y compara tamaño/hash.
Comprueba en navegador nuevo: identidad registrada, logs F11/F13/F02/F12/F03,
inventarios y recuperación F13, contexto/digest L01 histórico, mapa, navegación,
recarga y descargas. No debe llamar /api, localhost, WebSockets ni permitir ejecutar.
Prueba respaldos: Chromium de pruebas no decodifica H.264; WebM o reproductor
compatible son alternativas. Estos controles públicos quedan NOT_EXECUTED hasta
el despliegue; las pruebas locales no equivalen a Pages publicado.

Para volver a una versión anterior: nuevo commit revisado que restaure su lock
y transporte verificado, y dispatch manual desde main. Sin reconstruir laboratorio,
sobrescribir assets ni modificar evidencias.

La demo viva sigue el [procedimiento del índice](README.md), con sesión nueva
compatible y `--enable-actions` explícito. Pages no puede habilitar acciones.
Si falla internet, abre recorded.html original con file://, portable por HTTP
estático o el vídeo sin voz de 159,92 s. Consulta el [runbook congelado](static-freeze.md).

Verificación de bytes después del despliegue (destino local nuevo):

```bash
python3 implementacion/scripts/defense-demo/pages.py verify-public implementacion/evidence/packages/pages-public-v1
```
