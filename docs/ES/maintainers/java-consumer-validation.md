# Validación del consumidor Java — seguimiento de PR #78

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
