# Red de kind en Codespaces: diagnóstico y recuperación

[Guía del entorno](environment.md) · [Procedimiento completo en inglés](../EN/kind-network-firewall.md)

## Causa y solución aplicada

BuildKit no resolvía `registry-1.docker.io` mediante `127.0.0.11`. Se observó una
cadena IPv4 `FORWARD DROP` en `iptables-legacy` con reglas para `docker0`, pero
sin permiso para el puente kind. Al mismo tiempo había reglas de Docker en
`iptables-nft`. Una sonda en kind falló con `EAI_AGAIN` y el contador de descarte
legacy pasó de 390 a 400.

Con autorización explícita se añadieron temporalmente dos reglas al inicio de
FORWARD legacy: tráfico desde `br-6ccd0f219c98`, origen `172.18.0.0/16`, y tráfico
de retorno `RELATED,ESTABLISHED` hacia ese puente/subred. La resolución DNS y
`make -C implementacion demo` pasaron. No se cambiaron servidores DNS, permisos
del registro ni controles de entrega. Se eliminaron las dos reglas y se comprobó
que la cadena coincidía exactamente con la captura anterior.

Las reglas permiten todos los protocolos/destinos del puente compartido, no solo
DNS ni un único ensayo. Se aplican también a otros contenedores de kind y omiten
el filtrado posterior de esa cadena para los paquetes coincidentes.

## Alcance en Codespaces

La configuración del repositorio utiliza Docker-in-Docker privilegiado. Si el
motor está dentro del devcontainer y se dispone de privilegios, se puede gestionar
su firewall local. No hace falta cambiar el firewall externo de GitHub o Azure.
Hay que verificar dónde se ejecuta realmente el motor: un socket Docker accesible
no demuestra que el terminal comparta su espacio de nombres de red.

En esta sesión, el entorno de comandos aprobados y `dockerd` compartían
`net:[4026531840]`; el sandbox restringido del agente utilizaba otro espacio.
Consultar el contexto Docker, PID del motor, `/proc/<PID>/ns/net`, alternativa
iptables y ambas cadenas FORWARD antes de intervenir. Los comandos y argumentos
exactos están en la guía inglesa. Si el motor es remoto, la intervención corresponde
al propietario de ese entorno.

## Recuperación y uso futuro

El wrapper real se conserva en
`implementacion/evidence/raw/f05-f06-l03-network-review/run-with-forwarding.sh`,
excluido de Git como evidencia. Guarda la cadena previa, instala recuperación
EXIT/INT/TERM antes de modificarla, etiqueta cada regla y elimina solo sus reglas
exactas mediante `-D`. Conserva por separado el fallo principal y el de limpieza.
SIGKILL o pérdida del host requieren inspección y recuperación manual. El wrapper
supone la subred observada y no es un script portátil de arranque.

### Recuperación automática y repetible

Por petición del usuario, `lab_create` invoca ahora
[`codespaces-network.py`](../../scripts/codespaces-network.py) si
`CODESPACES=true`, después de crear kind y antes del registro y BuildKit.
Se aplica a la entrega local y a la preparación manual R/G, fuera del reloj de
la tarea. La línea B hosted no lo invoca. Fuera de Codespaces el helper se omite.

La comprobación descubre el puente/subred actuales y verifica que el socket local
y el único daemon visible comparten el espacio de nombres de red del terminal.
Solo añade reglas si DNS falla en kind, funciona en la red Docker predeterminada,
aumentan los descartes legacy y las cadenas coinciden con el conflicto registrado.
Si encuentra otro fallo o reglas desconocidas, detiene la preparación sin añadir
reglas. En kind solo puede haber nodos etiquetados con el clúster de este ensayo;
la reparación independiente exige un puente sin contenedores.

Las reglas llevan una etiqueta con el ID completo de la red y se comprueban con
`-C` para no duplicarlas. Un bloqueo local serializa las operaciones del helper,
pero otros comandos Docker no usan ese bloqueo: preparar ensayos secuencialmente
y evitar cambios simultáneos del firewall. DNS y HTTPS con TLS verificado deben
funcionar después; HTTP 401 de `/v2/` confirma acceso al registro autenticado.
Un error o interrupción capturable retira solo las reglas recién añadidas y
conserva los resultados principal y de recuperación. Una red sana no se modifica.

Las reglas correctas **permanecen para las siguientes preparaciones** hasta su
retirada explícita o pérdida tras reiniciar el entorno. Afectan a todo el puente
kind, incluidos futuros contenedores. La limpieza del ensayo conserva este par
compartido. No se vacían cadenas, cambia la política FORWARD ni modifica el
arranque de Docker. Si reaparece el conflicto tras reiniciar, la siguiente
preparación lo comprueba y repone el par. SIGKILL o pérdida del host pueden impedir
la recuperación; los comandos exactos de retirada se guardan antes de insertar.

Comandos opcionales desde la raíz del repositorio:

```bash
python3 implementacion/scripts/codespaces-network.py check
python3 implementacion/scripts/codespaces-network.py ensure
# Después de limpiar todas las tareas, sin contenedores conectados a kind:
python3 implementacion/scripts/codespaces-network.py remove
```

Salida: `Codespaces network: HEALTHY`, `RESTORED`, `REMOVED_OR_ABSENT` o fallo,
y ruta de evidencia. Las llamadas independientes guardan JSON bajo
`evidence/environment/`; la llamada automática guarda `codespaces-network.json`
en el ensayo y su paquete habitual. Incluye identidades, reglas, contadores,
resultados de sondas y retirada. Las sondas usan la imagen kind fijada y ya
almacenada, con `--pull=never`, y limpian sus contenedores. El helper requiere
el puente y esa imagen, normalmente creados por `lab_create`; no crea un clúster.

`run-E5wAPDEL` / `task-3f6b2c31609e` conserva su preparación fallida por DNS,
`INCOMPLETE`, sin reloj iniciado y con limpieza terminada. Cambió la identidad de
arranque y las reglas anteriores habían desaparecido. Las comprobaciones reales
de red y BuildKit del helper se guardan en
`evidence/environment/codespaces-network-development/`, separadas de la
calibración humana. El cambio de código exige **otro nombre de sesión/plan**,
conservando el intento previo. Véanse los [comandos reutilizables](manual-calibration-session.md).

## Propuesta a largo plazo

Conservar las versiones fijadas y corregir el arranque del entorno propietario de
Docker para que use de forma coherente el frontend iptables y su ciclo de vida.
Primero investigar el script Docker-in-Docker, las alternativas y el origen de
las reglas legacy; ese origen aún no está demostrado. Reproducir en un Codespace
nuevo con la configuración del repositorio y, si persiste, realizar una corrección
acotada en ambas configuraciones. Reconstruir solo el devcontainer puede conservar
un espacio de nombres externo; en ese caso hay que corregir el entorno propietario.
Cambiar el enlace de iptables por sí solo no elimina reglas ya instaladas.

Validar DNS, HTTPS del registro, construcción y demo sin excepciones temporales;
repetir tras reinicio/recreación. No se propone migrar al backend nftables nativo
experimental ni desactivar el firewall de Docker. `iptables-nft` no equivale a
`--firewall-backend=nftables`. Véase la [explicación oficial de Docker](https://docs.docker.com/engine/network/firewall-nftables/#forward-policy-in-iptables).
La solución permanente sigue propuesta, sin validar.

## Resultado conservado

`run-nWpDa9ZN` pasó F05/F06 en CI y admisión y L03 integrado. El intento de red
`attempt-kmesrCNn` terminó con códigos principal y recuperación 0. La auditoría
verificó 776 hashes internos y 108 bundles auténticos; rechazó los dos bundles F08
alterados esperados. Los negativos hosted siguen NOT_EXECUTED y la revisión humana
está pendiente. Véase el [registro de validación](../../registros/f05_f06_l03_validation_EN.md).
La actualización documental original no volvió a aplicar reglas ni a ejecutar
el demo. La incorporación posterior del helper, asistida por Codex, conserva
pruebas sintéticas de protección/orquestación y comprobaciones reales de red y
BuildKit. La ejecución de escenarios y la aceptación humana siguen separadas.
