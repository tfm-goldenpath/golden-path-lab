# Documentación en español

[Todos los documentos](../README.md) · [English documentation](../EN/README.md)

Esta documentación ofrece apoyo en español. La implementación y la documentación técnica principal están en inglés; los identificadores, contratos y pruebas ejecutables son comunes a ambos idiomas.

| Guía | Contenido |
| --- | --- |
| [Entorno y versiones](environment.md) | Preparación del devcontainer, versiones fijadas y comprobación del entorno. |
| [Arquitectura modular](architecture.md) | Responsabilidades, interfaces y límites de verificación de los componentes. |
| [Contratos de entrega](delivery-contracts.md) | Identidad del artefacto, evidencias obligatorias y comprobaciones de autorización. |
| [Ficha del caso L01/F13](cases/L01-F13/README.md) | Comportamiento esperado de la entrega legítima, la ausencia de resultados y las comprobaciones dirigidas de F11. |
| [Guía de ejecución L01/F13](cases/L01-F13/runbook.md) | Comandos locales y alojados, resultados esperados, diagnóstico y limpieza. |
| [Configuración de GitHub — en inglés](../EN/github-configuration.md) | Protecciones y configuración propuestas para el repositorio; el documento no activa esas opciones. |
| [Plan de implementación](implementation-plan.md) | Hitos incrementales y criterios de aceptación; la guía de ejecución contiene los comandos actuales. |
| [Migración a bundles de Cosign](cosign-bundle-migration.md) | Perfil candidato, observaciones locales/alojadas, revisión de PR y aceptación pendiente de correcciones/F07. |
| [Revisión de la propuesta externa](context/external-proposal-review.md) | Antecedente documental en español, separado de las instrucciones operativas. |

El [README de implementación](../../README.md) contiene los comandos principales y el [TODO](../../TODO.md) recoge el avance. Los [registros originales](../../registros/) conservan su idioma y alcance para distinguir las comprobaciones realizadas de las integraciones pendientes.

La carpeta `cases/L01-F13/` reúne la documentación del ensayo integrado, incluidas las comprobaciones dirigidas de F11. Sus pruebas se implementan una sola vez en [`tests/scenarios/`](../../tests/scenarios/); no se crean copias de código por idioma ni carpetas vacías para los veinte escenarios.
