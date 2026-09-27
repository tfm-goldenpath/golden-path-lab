# Golden Path Lab

[English](README.md) | [Español](README.es.md)

Laboratorio reproducible de comprobaciones tempranas de políticas y entrega verificable a Kubernetes. La implementación acompaña al TFM **Golden Path para la entrega cloud-native: verificación temprana de políticas e integridad en el flujo CI/CD**. La memoria, el catálogo académico y las decisiones de investigación se mantienen en el [repositorio del TFM](https://github.com/tfm-goldenpath/golden-path).

La base clásica **v0.1.0** está publicada en `9f1999e`. La [ejecución alojada 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654) superó L01/F13/F11 y la sustitución de imagen en `4f8fe77`, cambio incluido en esa versión. Su evidencia corresponde al commit ejecutado y al perfil clásico.

La versión publicada **v0.2.0**, en `dd381d3`, incorpora la [migración a bundles de Cosign](implementacion/docs/ES/cosign-bundle-migration.md) de la PR #15. Todos los pasos de la [ejecución alojada 36332256483](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36332256483) terminaron satisfactoriamente sobre esa revisión y hay un artefacto de evidencias disponible; todavía no se ha auditado el contenido del archivo. Siguen pendientes la admisión negativa real de F07 y la repetición local de la revisión final publicada. Mantiene Cosign 3.1.3, Kyverno 1.19.1 y la confianza diferenciada de A/B. Los registros anteriores de [compatibilidad local](implementacion/registros/cosign_bundles_validation_ES.md) y [revisión alojada](implementacion/registros/pr15_review_ES.md) conservan sus revisiones y límites. El método de veinte escenarios no cambia: fija el perfil adoptado tras el piloto y no mezcles tiempos de desarrollo clásico con mediciones de campaña bundle.

## Por qué se utiliza inglés

La implementación y su documentación técnica principal utilizan inglés para facilitar la contribución internacional, la reutilización y la coherencia con la terminología del ecosistema cloud-native. Se adopta como convención habitual de la industria, no como una norma técnica obligatoria. Un ejemplo es [Kubernetes, que mantiene documentación original en inglés y traducciones comunitarias](https://kubernetes.io/docs/contribute/localization/). La memoria y la justificación académica permanecen en español.

Esta página y las guías de `implementacion/docs/ES/` ofrecen apoyo documental en español; las principales están en `implementacion/docs/EN/`. El [índice de documentación](implementacion/docs/README.md) permite elegir idioma y tema. La ficha y guía del caso integrado se agrupan en `cases/L01-F13/` dentro de cada idioma. Los mensajes de ejecución se muestran en inglés también en estas guías, para que coincidan con las salidas reales. Cada escenario tiene una única implementación: traducir su explicación no cambia sus entradas ni sus criterios de aceptación. Los registros históricos conservan su idioma original.

## Contribuir con o sin IA

La [guía de contribución](CONTRIBUTING.md) define cambios acotados, comandos de comprobación y registro veraz de aportaciones. La [guía de desarrollo asistido](implementacion/docs/ES/ai-assisted-development.md) explica [`AGENTS.md`](AGENTS.md), las [instrucciones de Copilot](.github/copilot-instructions.md) y la [skill de cambio de escenario](.github/skills/scenario-change/SKILL.md). Las personas asumen requisitos, resultados esperados y revisión; los controles deterministas deciden la autorización. La IA queda excluida de las seis tareas manuales medidas.

Las instrucciones orientan; pruebas, permisos y reglas configuradas aplican sus respectivos controles. CI ejecuta las comprobaciones compartidas en cada PR y push. Esta guía no instala hooks, conexiones MCP, agentes personalizados ni permisos remotos. El laboratorio sigue siendo utilizable sin IA.

## Inicio rápido

Abre el repositorio en Codespaces o un devcontainer y selecciona **Golden Path - implementation**, correspondiente a `.devcontainer/implementacion/devcontainer.json`. Desde la raíz del repositorio:

```bash
cd implementacion
make doctor
make test
make demo
```

La demostración satisfactoria imprime este resumen antes de la limpieza y el empaquetado:

```text
== PASS: L01 accepted; F13 and F11 rejected. Evidence: <directorio-de-evidencias> ==
```

El mensaje añade la ubicación de las evidencias. La demostración utiliza `quotes-node`, crea un laboratorio efímero, comprueba la entrega inicial y la sustitución por otro digest verificado en L01, ausencia de autorización firmada en F13 y una carga privilegiada en F11. Conserva los paquetes bajo `implementacion/evidence/packages/`. Es una prueba de integración funcional; no equivale a ejecutar la campaña completa de veinte escenarios.

## Guías en español

- [Ejecución en devcontainer y GitHub Actions](implementacion/docs/ES/cases/L01-F13/runbook.md).
- [Caso L01/F13 y alcance de las comprobaciones](implementacion/docs/ES/cases/L01-F13/README.md).
- [Arquitectura modular](implementacion/docs/ES/architecture.md).
- [Contratos de entrega y límites de confianza](implementacion/docs/ES/delivery-contracts.md).
- [Entorno y versiones](implementacion/docs/ES/environment.md).
- [Desarrollo asistido por IA y atribución](implementacion/docs/ES/ai-assisted-development.md).

El [README técnico](implementacion/README.md), el [plan incremental](implementacion/TODO.md) y la [guía de configuración de GitHub](implementacion/docs/EN/github-configuration.md) están en inglés. El [README principal](README.md) describe la estructura, las condiciones de contribución y la política de idiomas.

La vía A utiliza infraestructura y claves locales de desarrollo; la vía B requiere GitHub Actions, GHCR e identidad OIDC real. Las configuraciones R/G comparan el recorrido de referencia con el Golden Path y son independientes de esas vías. Los [registros de validación](implementacion/registros/validacion_importacion_ES.md) delimitan qué se comprobó y qué permanece pendiente.

La [validación de esta revisión de idioma](implementacion/registros/language_normalization_EN.md), en inglés, recoge las comprobaciones realizadas y la incidencia pendiente del ejecutable Conftest en Windows.
