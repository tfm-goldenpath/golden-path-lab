# Documentación en español

[Todos los documentos](../README.md) · [English documentation](../EN/README.md)

Esta documentación ofrece apoyo en español. La implementación y la documentación técnica principal están en inglés; los identificadores, contratos y pruebas ejecutables son comunes a ambos idiomas.

| Guía | Contenido |
| --- | --- |
| [Entorno y versiones](environment.md) | Preparación del devcontainer, versiones fijadas y comprobación del entorno. |
| [Arquitectura modular](architecture.md) | Responsabilidades, interfaces y límites de verificación de los componentes. |
| [Contratos de entrega](delivery-contracts.md) | Identidad del artefacto, evidencias obligatorias y comprobaciones de autorización. |
| [Desarrollo asistido por IA](ai-assisted-development.md) | Asistencia acotada, responsabilidad humana, instrucciones, skill de escenarios y atribución veraz. |
| [Ensayos de workflows F01/F02](cases/F01-F02/runbook.md) | Casos estáticos inertes, atribución exacta Conftest y evidencia conservada. |
| [Ensayos F11/F12/L06](cases/F11-F12-L06/runbook.md) | CREATE/UPDATE de plantilla Deployment, Pods aislados, atribución y estado; aceptación real pendiente. |
| [F07 CI / L04](cases/L04/record.md) | Verificación fresca, restauración exacta y sustitución legítima compartida. |
| [Compatibilidad F07 alojada](cases/F07/hosted-compatibility.md) | Cobertura local, investigación GHCR acotada y comandos inactivos. |
| [Ficha del caso L01/F13](cases/L01-F13/README.md) | Comportamiento esperado de la entrega legítima, la ausencia de resultados y las comprobaciones dirigidas de F11. |
| [Guía de ejecución L01/F13](cases/L01-F13/runbook.md) | Comandos locales y alojados, resultados esperados, diagnóstico y limpieza. |
| [Configuración de GitHub — en inglés](../EN/github-configuration.md) | Protecciones y configuración propuestas para el repositorio; el documento no activa esas opciones. |
| [Plan de implementación](implementation-plan.md) | Hitos incrementales y criterios de aceptación; la guía de ejecución contiene los comandos actuales. |
| [Migración a bundles de Cosign](cosign-bundle-migration.md) | Perfil bundle, observaciones históricas locales/alojadas, revisión de PR y aceptación pendiente. |
| [Revisión de la propuesta externa](context/external-proposal-review.md) | Antecedente documental en español, separado de las instrucciones operativas. |

El [README de implementación](../../README.md) contiene los comandos principales y el [TODO](../../TODO.md) recoge el avance. Los [registros originales](../../registros/) conservan su idioma y alcance para distinguir las comprobaciones realizadas de las integraciones pendientes.

La [guía de contribución](../../../CONTRIBUTING.md) y la [plantilla de PR](../../../.github/pull_request_template.md), en inglés, se aplican tanto a contribuciones asistidas como sin IA.

La carpeta `cases/L01-F13/` reúne la documentación del ensayo integrado, incluidas las comprobaciones dirigidas de F11. Sus pruebas se implementan una sola vez en [`tests/scenarios/`](../../tests/scenarios/); no se crean copias de código por idioma ni carpetas vacías para los veinte escenarios.
