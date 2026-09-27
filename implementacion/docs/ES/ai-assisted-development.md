# Desarrollo asistido por IA

[English](../EN/ai-assisted-development.md) · [Guía de contribución](../../../CONTRIBUTING.md) · [Documentación](README.md)

La asistencia de IA apoya la implementación y documentación; no forma parte del modelo de confianza de la entrega. Las personas asumen los requisitos, resultados esperados de las pruebas, revisión e interpretación. Un asistente puede proponer un cambio acotado, pruebas o explicaciones y ejecutar comprobaciones autorizadas. Sus propuestas y la revisión de otro asistente deben contrastarse con los requisitos y las evidencias.

## Instrucciones del repositorio

| Archivo | Función |
| --- | --- |
| [`AGENTS.md` raíz](../../../AGENTS.md) | Contexto, alcance, comandos y restricciones esenciales para asistentes compatibles. |
| [Instrucciones de Copilot](../../../.github/copilot-instructions.md) | Reglas breves del repositorio para las funciones compatibles de Copilot. |
| [Skill de cambio de escenario](../../../.github/skills/scenario-change/SKILL.md) | Procedimiento reutilizable para un cambio acotado: contrato, entradas, comprobaciones y evidencias. |
| [Guía de contribución](../../../CONTRIBUTING.md) y [plantilla de PR](../../../.github/pull_request_template.md) | El mismo proceso de revisión y registro para contribuciones con y sin asistencia. |

La compatibilidad y carga de instrucciones dependen del cliente y la función. Comprueba qué archivos se cargan antes de confiar en ellos. No presupongas la lectura automática de enlaces o instrucciones anidadas. Consulta la [matriz oficial de instrucciones](https://docs.github.com/en/copilot/reference/custom-instructions-support) y la [documentación de skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills).

Estos archivos orientan; no crean aislamiento ni una barrera de seguridad obligatoria. Las pruebas y políticas comprueban el comportamiento; los permisos y reglas configuradas del repositorio limitan acciones. Una skill no sustituye CI ni admisión, y un workflow no convierte por sí solo una prueba en requisito de merge. Este incremento no añade hooks, conexiones MCP, agentes personalizados ni permisos remotos. Incorpóralos solo por una necesidad concreta y con alcance de acceso explícito; los hooks locales futuros serían ayuda adicional.

## Método de trabajo

Fija primero el comportamiento esperado y las rutas permitidas. Para un comportamiento nuevo o un defecto, inspecciona una prueba dirigida que falle, realiza el cambio acotado y repite las regresiones pertinentes. La falta de un ejecutable es un fallo de entorno, no un rojo válido de TDD. Conserva entradas legítimas e inválidas, comprueba los motivos de rechazo y registra los fallos sin alterar expectativas para fabricar un éxito. No inventes ciclos rojo/verde históricos; el comportamiento existente admite pruebas de caracterización y la documentación, revisión editorial y de enlaces.

Desde la raíz del repositorio, en el entorno Linux de desarrollo, utiliza los comandos reales compartidos:

```bash
make -C implementacion doctor
make -C implementacion test
```

Selecciona las comprobaciones dirigidas y la integración real según la [guía de contribución](../../../CONTRIBUTING.md). Verifica la revisión pertinente y conserva sus evidencias. Pruebas unitarias, entradas sintéticas, criptografía sin conexión y admisión alojada respaldan afirmaciones distintas; una ejecución anterior no valida una corrección posterior.

El método de veinte escenarios no cambia. Los controles deterministas deciden la autorización en ejecución; se excluye la IA generativa de las seis tareas manuales medidas. La asistencia no constituye otro tratamiento experimental ni prueba productividad. Mantén diferenciadas R/G y la confianza local/alojada; no debilites requisitos para que se acepte un escenario deliberadamente inválido.

## Atribución breve y veraz

Utiliza la plantilla de PR o un registro existente enlazado para contribuciones relevantes. Registra actividad, asistencia y herramienta/modelo cuando se conozcan, estado de revisión humana, decisión y evidencia. Mantén la revisión pendiente hasta que una persona la realice. Las pruebas automáticas y revisiones de IA no son revisión humana. Conserva la atribución real, incluidas las contribuciones históricas de Codex; prever Copilot no demuestra haberlo utilizado.

Basta una entrada breve por contribución relevante. No se exige diario horario ni archivo completo de prompts. Excluye secretos, claves privadas y datos reales de clientes de los prompts y archivos del repositorio. El laboratorio y sus pruebas siguen siendo utilizables sin IA.
