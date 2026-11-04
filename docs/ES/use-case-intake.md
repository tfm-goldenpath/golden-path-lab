# Proponer un caso de uso

[Índice](README.md) · [English](../EN/use-case-intake.md)

**[Abrir el formulario de casos de uso](https://github.com/tfm-goldenpath/golden-path-lab/issues/new?template=use-case.yml)**
para proponer un servicio, integración de entrega, control de seguridad o calidad,
escenario de prueba o mejora de documentación. Puedes responder en español o inglés sin conocer el repositorio. Busca primero en
las [solicitudes existentes](https://github.com/tfm-goldenpath/golden-path-lab/issues);
quizá ya exista una similar.

Las solicitudes son públicas. Omite secretos, datos personales/de clientes y
evidencia privada; este formulario no admite informes confidenciales de vulnerabilidades.

## Qué incluir

Los tres primeros campos son obligatorios; los dos últimos son opcionales.
Las etiquetas están en inglés:

- **Request category:** elige la categoría más cercana o “Unsure or general request”
  si dudas. “Security or quality check” corresponde a un control de seguridad o
  calidad de la entrega; “Test scenario”, a una prueba controlada del comportamiento.
- **What would you like to do, and what gets in your way?** Explica qué necesitas,
  qué dificultad encuentras hoy y un ejemplo breve.
- **What would success look like?** Describe algo que otra persona pueda comprobar,
  como localizar el comando adecuado y seguir sus prerrequisitos.
- **Where would you use this?** Indica herramientas, entorno local/nube y límites
  relevantes, como memoria o acceso a la red. Puedes dejar detalles sin concretar.
- **Examples, links or implementation ideas:** añade referencias públicas útiles
  o un posible enfoque, si lo tienes. No hace falta un diseño técnico.

Para controles de seguridad o calidad, describe entradas permitidas, rechazadas y una
comprobación no disponible; esta última es un error, no una detección satisfactoria.

## Dos ejemplos

Son **capacidades propuestas, no funcionalidades implementadas**.

**Ensayo de un servicio Java.** Un desarrollador quiere probar la entrega de un
servicio Maven pequeño, pero no encuentra un ejemplo inicial. El resultado deseado
es seguir una guía para compilarlo, desplegarlo y confirmar la imagen esperada.
Depende del futuro soporte de una plantilla de consumidor: un punto de partida
para proyectos que usen las herramientas de entrega. ¿Qué herramientas de build
Java debería cubrir?

**Reevaluación de vulnerabilidades antes de redesplegar.** Un operador quiere
revisar una imagen existente porque la información sobre vulnerabilidades puede
haber cambiado. Desea un informe asociado a la imagen exacta que distinga resultado
permitido, hallazgo bloqueante y análisis no disponible. El informe indicaría cuándo
se realizó el análisis y qué base de vulnerabilidades utilizó. ¿Qué antigüedad
máxima debería admitirse?

## Qué ocurre después

Quienes mantienen el proyecto evaluarán la solicitud y podrán pedir más información.
Enviarla no garantiza su implementación.

1. **Aclarar la solicitud:** buscar duplicados y completar datos importantes.
2. **Evaluar la viabilidad:** considerar compatibilidad, pruebas y recursos según
   el [plan vigente (EN)](../../implementacion/TODO.md) y la [guía de controles](how-it-works.md).
3. **Registrar la decisión:** **needs information** pide datos; **candidate** propone
   planificar; **deferred** aplaza; **declined** descarta, explicando el motivo.

El trabajo seleccionado tendrá una PR de implementación y un plan de validación
separados. Son decisiones de planificación, no etiquetas automáticas.
