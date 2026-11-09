# Validación del consumidor Java — seguimiento de PR #78

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
