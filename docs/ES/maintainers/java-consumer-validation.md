# Validación del consumidor Java — seguimiento de PR #78

## Nuevas entregas y custodia persistente — 10 de noviembre de 2026

Java `delivery-GKchqp9L` y Node `delivery-wZNLxGVu` **PASS** en el motor real
`e083164f749babc070378be052b90577fc4a7d71`, partiendo del árbol limpio. Este registro
añade ejecuciones nuevas; no reasigna recibos históricos. El commit documental
final y las identidades de CI push/PR se registran en PR #78. Revisión humana pendiente.

Al reanudar faltaba `/tmp/pr78-20261109-fresh-temp/` y `/tmp` mostraba otro
dispositivo. El propietario indica que no reinició Codespaces; la causa es
indeterminada. Los consumidores y bytes DB de esos intentos ya no están disponibles.
Los tres paquetes del 9 de noviembre siguen intactos y se reverificaron sus hashes
externos y 67/179/166 internos. Se conserva explícitamente esa pérdida de custodia;
no se reconstruyeron originales. El propietario autorizó intentos nuevos.

Los nuevos consumidores se inicializaron y confirmaron en repositorios separados
bajo `/workspaces/pr78-20261110-consumers/`, con bundles Git verificados en
`implementation/evidence/raw/pr78-20261110-custody/`. Identidades sintéticas:

| Consumidor / sufijo de `https://example.invalid/` | Commit |
| --- | --- |
| Java / `pr78-20261110-java` | `383da64f1b4a15ed668fd677303a633765b450c9` |
| Node / `pr78-20261110-node` | `27768fc2fc2f2a6e4f4fa32dbf429840843f06e3` |

Ambas entregas pasaron captura inmutable, pruebas reales, build fijado, SBOM y
esquema completos, análisis de vulnerabilidades, cuatro evidencias autenticadas,
vínculos exactos, admisión restringida, rollout y HTTP. `/version` identifica cada
commit consumidor y los Pods ejecutan el digest verificado. Java conserva **192Mi**.
El rechazo dirigido cambió solo `engineCommit` en la política aislada de resultados:
`CONSUMER_BINDING_engineCommit`, atribuido únicamente a
`pr78-tfm-results / autogen-require-results`; restaurar aceptó la misma imagen.
Las políticas originales no cambiaron y los recursos aislados se retiraron por UID.

Los paquetes Java/Node verificaron 179/166 hashes internos. Las DB comprimidas
(1.200.301.121/174.320.305 bytes) se conservaron además en el workspace, dentro de
`database-material/`, con sidecars, lectura completa de miembros contra sus
identidades y verificación del SHA-256 tras copiar. Los originales nuevos siguen
en `/tmp/pr78-20261110-work/`, pero ya no son la única copia. El primer intento del
helper Node esperaba un recibo exclusivo de Java y falló antes de escribir; el
error se conserva y la copia posterior comprobó la identidad de origen tras la
entrega. No se modificaron informes. El
[registro EN](../../EN/maintainers/java-consumer-validation.md#renewed-delivery-and-durable-custody--10-november-2026)
contiene todos los digests, archivos, SHA-256, identidades DB y límites.

Se reutilizó la imagen devcontainer verificada, sin reconstruir el Codespace activo.
Hook, smoke no-root sin autenticación, doctor y 10 pruebas de entorno pasaron:
Node 24.22.1, npm 12.2.2, Codex 0.167.0. La suite compartida completa ya pasó en
`1517eae`; solo documentación cambió hasta `e083164`. Los 69 inputs de cada
consumidor conservan bytes y modos ejecutables. CI del head documental final y sus
artefactos Java normal/negativo se verifican en el handoff. También se verificaron
CI push/PR 42659620418/42659635742 de `e083164`. No se justifica otra integración
de perfil fijo: no cambió runtime compartido. No se ejecutaron catálogo ni hosted.

Ejecución secuencial en el host de 2 CPU/8 GB autorizado; los tres perfiles conservan
4 CPU/16 GB/32 GB. Cleanup soportado retiró ambas entregas; luego se retiraron el
contenedor auxiliar y sus dos volúmenes identificados. A las 07:59:40 UTC no quedan
contenedores ni volúmenes: Docker/workspace tiene **10.190.204.928 bytes** y
1.717.688 inodes libres; `/tmp`, **30.327.496.704 bytes** y 2.948.457 inodes.
Consumo neto retenido: 1.395.859.456 bytes de workspace y 11.549.655.040 temporales.
Se preservaron imágenes/cachés previas y paquetes históricos; sin prune general.
La aceptación técnica está completa; revisión humana, instalación efectiva de la
extensión/inicio de sesión, producción y soporte Java general no se infieren.

## Aceptación en Codespace nuevo — 9 de noviembre de 2026

Este seguimiento sustituye el estado bloqueado de los registros históricos de abajo.
Motor integrado: `1517eae9b8bca75ca8c5cf8c58acae42738eda0d`. Java
`delivery-YoZBjqac` y Node `delivery-vJaLLQ4B` **PASS**, con consumidores independientes,
cuatro evidencias autenticadas, admisión restringida, digest desplegado y HTTP.
Java conserva 192 MiB. La prueba aislada rechazó únicamente
`CONSUMER_BINDING_engineCommit` y aceptó la misma imagen tras restaurar la expectativa;
se retiraron recursos por UID y las políticas originales no cambiaron.

El primer intento `delivery-2S0pATl4` conserva su rechazo por CVE-2026-109518,
APT 2.8.3. Se fijaron solo apt/libapt-pkg6.0t64 2.8.4ubuntu0.1 desde la instantánea
firmada Ubuntu 20261109T000000Z antes de crear consumidores nuevos. No se relajaron
políticas, pins de imagen ni límites. Se verificaron los tres paquetes y sus
67/179/166 hashes internos; el [registro EN](../../EN/maintainers/java-consumer-validation.md#fresh-codespace-acceptance--9-november-2026)
contiene commits, identidades sintéticas, digests, SHA-256 y DB exactos.

npm 11.19.1 → 12.2.2 y Codex 0.164.0 → 0.167.0 se verificaron contra metadatos
oficiales, compatibles con Node 24.22.1. El instalador existente verifica npm antes
de instalarlo; Codex conserva lock aislado y `/opt/codex`. Build completo, hook y
smoke sin autenticación como `node` pasaron. Los tres perfiles conservan
4 CPU/16 GB/32 GB y `openai.chatgpt`; no se observó instalación efectiva de la
extensión remota. Inicio de sesión interactivo privado: `codex login`.
El host real tenía 2 CPU/8 GB; el propietario autorizó continuar secuencialmente.
No se reinició el Codespace activo. Doctor pasó en el contenedor configurado.

Las pruebas Java reales y el negativo de enlace pasaron: Maven terminó correctamente,
la colección rechazó el enlace, retiró el productor y no conservó contenido externo.
Los recibos de CI, suite final, continuidad de bytes/modos y capacidad final se
conservan en `implementation/evidence/raw/pr78-20261109-fresh/` y PR #78.
Los paquetes antiguos no se transfirieron ni reverificaron en este entorno.
Se conservan consumidores y DB en `/tmp/pr78-20261109-fresh-temp/`; preservar ese
montaje antes de reiniciar. La evidencia ignorada no está en Git.
El SBOM Java identifica Ubuntu, 108 paquetes Debian y la aplicación, no el JRE
Temurin como componente separado. No demuestra inventario completo ni soporte de
frameworks. OIDC alojado, publicación pública, producción y catálogo quedan fuera.
Revisión humana y decisión de merge **pendientes**; no se fusionó la PR.

Suite final PASS: doctor, 10 pruebas de entorno, 1.096 de servicio/unidad,
132 Python de políticas, Conftest/Kyverno, criptografía offline, workflows,
153 de defensa y 22 de release. Inventario: 854 rutas/11 pruebas; 192 enlaces
relativos/anclas y whitespace correctos. Los 69 inputs de cada consumidor
conservan bytes y modos ejecutables del motor integrado tras editar documentación.
A las 16:55:05 UTC no quedan contenedores ni volúmenes; se retiraron también el
contenedor de validación y sus dos volúmenes identificados. Docker/workspace:
12.376.997.888 bytes libres; `/tmp`: 23.369.474.048. Se conservan cachés
reproducibles y material DB; no se hizo prune general.

El [registro detallado único en inglés](../../EN/maintainers/java-consumer-validation.md#pr-78-review-follow-up--9-november-2026)
conserva revisiones, comandos, hashes, fallos y límites. La
[guía Java](../java-consumer-quickstart.md) contiene los comandos operativos.

Se partió de `25ba72af5393ed37b5441bdbd00698f733a8e8c4`, sin descartar los archivos
npm ajenos. Dos reproducciones con dobles de Docker y un sentinel inocuo fallaron
antes de corregir: recolección de enlaces externos y ENOSPC que impedía cleanup y
sustituía el timeout. Ahora se retira el productor verificado antes de leer salidas;
se usan descriptores relativos sin seguir enlaces, fstat y límites de entradas/bytes.
Se rechazan enlaces, FIFO/socket y otros objetos no regulares, también en JAR/POM.

El retiro se intenta aunque falle ejecución o evidencia. Se conserva el error
primario y se registran errores secundarios por separado; no hay PASS con errores
pendientes. Sin retiro confirmado no se recopila y se preserva trabajo/recibos
para recuperación. Los informes originales mantienen bytes, mtime y hashes.

Las regresiones sintéticas cubren tipos de archivo, carreras al abrir, informes,
límites, ownership y errores de escritura/lectura/hash/retiro. CI añade una prueba
real secuencial del enlace inocuo después de las pruebas Java normales; ese límite
no demuestra admisión ni entrega. Los resultados exactos se enlazan desde el
registro inglés y la descripción de la misma PR. Revisión humana pendiente.

El inventario del 9 de noviembre a las 13:58:13 UTC encontró 8.364.621.824 bytes
libres en Docker/workspace, con **2.372.796.416 bytes adicionales necesarios** solo
para alcanzar la puerta Java de 10 GiB. `/tmp` es independiente y no amplía Docker.
No hay contenedores ni paquetes APT descargados. Los volúmenes históricos carecen
de recibos inmutables de montaje suficientes para autorizar borrado. **0 bytes
recuperados**; se conserva evidencia, snapshots, imágenes y volúmenes.

La ruta antigua `/tmp/java-consumer-trial` no existe en esta sesión; las copias en
`implementation/evidence/raw/java-consumer-trial/` sí. No se atribuyen recibos
antiguos al runner corregido ni se reconstruyen originales perdidos. La entrega
Java completa, DB actuales/SBOM de imagen, rollout a 192 MiB, rechazo de admisión
y restauración, y entrega Node siguen **NOT_EXECUTED** para esta corrección.
Son bloqueos de merge. No se crea otro archivo grande en almacenamiento limitado.

El handoff inglés indica cómo transferir paquetes y sidecars existentes, evidencia
histórica, recuperación privada y snapshots a un Codespace con capacidad verificada,
comprobar hashes, fijar el commit exacto del motor y crear intentos nuevos. Conserva
las puertas de capacidad, perfiles/productores, siete controles y cuatro evidencias.
OIDC hosted, publicación, producción y catálogo completo siguen NOT_EXECUTED.

El fix runtime es `7a0127a5d435f2f34fec652c151d1a839bb0a012`. Push CI
42631337823 y PR CI 42631348008 pasaron en intento 1. En ambos, dos pruebas Java
reales pasaron y el enlace inocuo fue rechazado después de Maven exit 0 y retiro
confirmado. Se descargaron ambos ZIP; digest GitHub y hashes internos coinciden,
sin enlaces ni bytes del sentinel en los 20 archivos de cada artefacto, incluida
la evidencia del intento rechazado. El registro inglés conserva IDs/hashes exactos.
Los cambios posteriores son documentación; se verifica continuidad de los 70
inputs canónicos. La PR y `final-head-ci.json` registran HEAD final y su CI propia.
Esto no elimina el bloqueo de las entregas locales ni demuestra admisión.
