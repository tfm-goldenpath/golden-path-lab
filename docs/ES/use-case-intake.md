# Proponer un caso de uso

[Índice](README.md) · [English](../EN/use-case-intake.md) · [Contribuir (EN)](../../CONTRIBUTING.md)

Usa el [formulario de casos de uso](https://github.com/tfm-goldenpath/golden-path-lab/issues/new?template=use-case.yml)
para un servicio/lenguaje, integración de entrega, control, cobertura del laboratorio
o mejora de documentación/operación. Busca primero en las [incidencias existentes](https://github.com/tfm-goldenpath/golden-path-lab/issues).
Si dudas, elige “Unsure or general request”. El mismo formulario admite respuestas
en español o inglés; las consultas y defectos conservan las vías existentes.

Es una **solicitud pública y no sensible**, no un canal confidencial de
vulnerabilidades. Omite credenciales, tokens, información personal/de clientes,
claves privadas, evidencia privada, logs completos y archivos de evidencias.
El aviso no detecta secretos automáticamente ni establece un canal privado.

## Hacer la solicitud útil

Las cinco respuestas obligatorias son categoría, problema/valor, caso concreto,
entorno/restricciones y criterios de aceptación observables. Explica a quién afecta,
qué ocurre hoy y qué mejora podría observar. Un ejemplo breve resulta más útil
que una arquitectura propuesta.

Lenguaje/build, ejecución local o alojada, relevancia de Kubernetes, CPU/RAM/disco,
red y compatibilidad pueden ser **desconocidos**. Indica qué sabes y qué requiere
investigación; no necesitas IDs de políticas, diseño de implementación ni mapeo
regulatorio. Las ideas de implementación y referencias son opcionales.

Formula criterios como “dada esta entrada, al realizar esta acción, observar este
resultado”. Para un control, distingue:

- **Entrada permitida:** qué se permite y qué observación lo demuestra.
- **Entrada prohibida:** qué se rechaza y cómo se atribuye la decisión.
- **Imposibilidad de evaluar:** qué ocurre si registro, verificador o evaluador no
  terminan. Un fallo de integración no es detección satisfactoria; un exit no cero
  no demuestra rechazo por el control esperado.

En documentación, un criterio puede ser localizar el comando aplicable y sus
prerrequisitos desde la guía sin conocer el laboratorio. Expón preguntas abiertas
en lugar de inventar resultados satisfactorios o declarar aceptación anticipada.

## Reutilizar contexto de forma segura

Consulta los [controles implementados](how-it-works.md#localizar-controles-de-bloqueo)
y la [matriz de preparación](../../implementacion/docs/ES/evaluation-readiness.md).
Cita un Fxx/Lxx existente si corresponde: son los veinte escenarios establecidos,
no identificadores para asignar o renumerar en una solicitud. **A/B** significa
ejecución y confianza local/alojada; **R/G**, controles de referencia/Golden Path.
Las claves locales no demuestran integración de confianza alojada.

Si ayuda una evidencia pública, enlaza la observación sin datos sensibles e indica
revisión de fuente, digest si corresponde, ejecución y frontera observada. Explica
qué demuestra y qué queda desconocido. Conserva fallos y barreras no alcanzadas.
Una ejecución histórica satisfactoria no valida una revisión nueva; enlazar
una evidencia tampoco vuelve a autenticar su contenido firmado. No subas estado
privado ni archivos para completar la solicitud.

## De propuesta a implementación

Un cambio de producto añade o modifica comportamiento para consumidores u operadores.
Una extensión de laboratorio añade un ensayo controlado y un resultado esperado
para evaluar comportamiento. Pueden necesitar trabajos separados: una prueba nueva
no entrega por sí sola una capacidad consumible; código implementado tampoco
acredita ejecución de escenario.

El proceso ligero de mantenimiento es:

1. Revisar duplicados, alcance e información que falta.
2. Identificar módulo/control afectado y pruebas existentes pertinentes.
3. Definir expectativas positivas, negativas y de error de integración cuando proceda.
4. Evaluar compatibilidad, evidencia necesaria y coste de recursos.
5. Registrar una decisión de planificación: **needs information** (falta información),
   **candidate** (candidata), **deferred** (aplazada) o **declined** (descartada), con
   motivo breve y preguntas abiertas.
6. Si se selecciona la implementación, crear una rama/PR con alcance propio y plan
   de validación. Los cambios de laboratorio siguen las [instrucciones de escenarios (EN)](../../.github/skills/scenario-change/SKILL.md).

Son decisiones documentadas, no etiquetas GitHub, automatización ni tablero
obligatorio. No hay SLA de respuesta ni compromiso de implementación. Enviar no
establece soporte, autoriza implementar ni demuestra eficacia del control. Una
candidata es una opción; implementado significa que existe código; verificado
requiere comprobaciones sobre revisión y frontera identificadas. La revisión y
aceptación humanas se registran aparte, sin inferirlas del envío, merge o CI verde.

El [plan vigente (EN)](../../implementacion/TODO.md) y el
[contrato de migración (EN)](../EN/maintainers/repository-map.md#migration-sequence)
conservan: separación física producto/laboratorio → consolidación de interfaz →
plantilla de consumidor independiente → ensayo Java. Esta incorporación acotada
tiene autorización propia; aceptación humana P00/P01, custodia y reestructuración
siguen separadas. La selección de admisión continúa bloqueada por sus requisitos
de capacidad y validación. El formulario no reabre investigaciones inconclusas ni
adopta Graphify, Serena o Repomix. Un futuro mapeo regulatorio necesita fuentes y
revisión separadas.

## Solicitudes ilustrativas — no implementadas

Ambos ejemplos son resultados propuestos, no funcionalidades entregadas ni ejecuciones.

**Ensayo consumidor Java.** Categoría: nuevo servicio/lenguaje. Un desarrollador
Java quiere probar un servicio Maven pequeño mediante la futura plantilla, sin
aprender los fixtures del laboratorio. Ejemplo: compilar y entregar su imagen
identificada usando la interfaz soportada. Entorno inicial: Linux local; relevancia
de Kubernetes, capacidad y red por confirmar. Observación deseada: un consumidor
independiente sigue prerrequisitos documentados, invoca esa interfaz y asocia las
observaciones a la imagen esperada; entradas no soportadas e infraestructura no
disponible tienen resultados distintos. Depende del trabajo de interfaz/plantilla;
**hoy no existen soporte Java ni esa plantilla**. Compatibilidad de build y alcance
de validación quedan por definir.

**Reevaluación de vulnerabilidades.** Categoría: nuevo control. Un operador quiere
reevaluar una imagen desplegada o comprobarla antes de redesplegar cuando cambia
el conocimiento de vulnerabilidades. Ejemplo: evaluar el mismo digest inmutable
con análisis/base identificados y conservar la decisión. Entorno: carga Kubernetes;
evaluación local o alojada, acceso al registro y límites aún por decidir. Resultados
deseados: informe permitido distinto de hallazgo prohibido atribuible; análisis
no disponible o identidad de imagen incorrecta son errores de evaluación, no
análisis limpio ni detección satisfactoria. ¿Qué antigüedad es admisible? ¿Qué
snapshot e identidad deben conservarse y qué acción debe seguir? Solicita diseño
y alcance de validación; no implementa ni promete monitorización continua,
revocación o remediación automática.

## Mantenimiento del formulario

La [fuente](../../.github/ISSUE_TEMPLATE/use-case.yml) sigue la
[sintaxis oficial](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
y el [esquema de formularios](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema)
(consultados el 4 de noviembre de 2026). Parseo y pruebas locales no demuestran
renderizado GitHub. Tras merge, abre el formulario desde **New issue**, comprueba
campos, obligatoriedad y enlaces, y sal sin enviar una incidencia de prueba. La
revisión humana de usabilidad es distinta de un recorrido del asistente.
