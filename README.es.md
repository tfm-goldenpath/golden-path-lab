# Golden Path Lab

[English](README.md) · [Español](README.es.md)

Golden Path comprueba que una entrega de contenedor tenga la configuración,
las evidencias de imagen y el origen autorizado requeridos antes de admitirla
en Kubernetes. Resuelve un problema de entrega: compilar correctamente no demuestra
qué se ha entregado, qué controles han pasado ni por qué debe permitirse desplegar.

Este repositorio implementa ese enfoque en un laboratorio de investigación con el
servicio sintético `quotes-node`. Permite a desarrolladores inspeccionar controles
y a responsables de plataforma evaluar cómo se relacionan políticas, firmas y
evidencias operativas. Actualmente no es un producto autónomo para consumidores.

## Vista de la entrega

```text
Fuente + configuración → pruebas y política de workflow → build → digest
  → política de manifiesto → SBOM original → análisis y política de vulnerabilidades
  → firma independiente de imagen + attestations de SBOM/procedencia
  → verificación fresca → autorización firmada → admisión Kubernetes
  → rollout + HTTP → conservación de evidencias + limpieza de recursos propios
```

Es el flujo protegido; el laboratorio añade fallos controlados y una entrega de
referencia. La procedencia alojada se emite entre preparación y finalización.
[Cómo funciona](docs/ES/how-it-works.md) explica orden, bloqueos y evidencias.

## Disponibilidad actual

| Disponible o previsto | Frontera |
| --- | --- |
| Laboratorio implementado | Entorno Linux fijado, políticas tempranas, análisis de imagen, evidencias firmadas separadas, verificación, admisión y comprobaciones funcionales. |
| Observaciones registradas | Resultados locales/alojados sobre revisiones históricas identificadas y datasets de medición separados. La [matriz](implementacion/docs/ES/evaluation-readiness.md) conserva cobertura y huecos; la [decisión humana fechada](implementacion/registros/evaluation_acceptance_20261004_ES.md) cierra solo su alcance reducido. |
| Plantilla de consumidor: prevista | La extracción del motor neutral y una plantilla soportada son trabajo futuro. Véase la [secuencia de migración](docs/EN/maintainers/repository-map.md#migration-sequence). |
| Sin soporte o sin verificar | No se afirma preparación para producción, conformidad DORA completa, SLSA Build L3, inventario SBOM completo ni ausencia general de vulnerabilidades. Los negativos alojados no ejecutados siguen sin ejecutarse; las ejecuciones históricas no validan la fuente actual. |

## Primeros pasos

Sigue la [ruta de lectura y evidencias sin clúster](docs/ES/getting-started.md).
Conecta las fases con resultados versionados y sus fuentes/ejecuciones sin instalar
herramientas ni crear recursos.

Para ejecutar deliberadamente, entra en el [laboratorio](lab/README.es.md).
`make -C implementacion demo` crea kind, un registro y un builder, construye imágenes
y ejercita escenarios. No es un inicio rápido para consumidores.

## Controles y evidencias

La entrega puede detenerse en controles de fuente/workflow, política de manifiesto,
vulnerabilidades, verificación de firmas/contenido o admisión. Un fallo posterior
de rollout o HTTP no demuestra rechazo de admisión. Revisa la decisión estructurada
y el log original para atribuir la causa. La [guía de fases y controles](docs/ES/how-it-works.md)
enlaza identificadores, ejemplos, implementación y pruebas; los
[contratos](implementacion/docs/ES/delivery-contracts.md) separan imagen, SBOM,
análisis, procedencia y resultados.

## Laboratorio

[Entrada al laboratorio](lab/README.es.md): ejecución, veinte escenarios,
confianza local/alojada, configuraciones de referencia/protegida, mediciones,
aceptación histórica, defensa y recuperación de la release congelada.
Las instrucciones de presentación y la cronología conservan sus guías canónicas.

## Contribución, soporte y hoja de ruta

Consulta [CONTRIBUTING.md](CONTRIBUTING.md), el [índice](docs/ES/README.md),
[inventario y contrato de migración](docs/EN/maintainers/repository-map.md) y
[TODO actual](implementacion/TODO.md). El inglés es primario y se sincroniza la
entrada española. Las personas asumen requisitos y revisión; las herramientas
deterministas deciden la autorización de entrega.

No hay licencia global de reutilización declarada. Los avisos de terceros conservan
sus términos. La licencia y el canal privado de seguridad requieren decisión del
propietario; véase [reutilización y soporte](docs/ES/getting-started.md#reutilización-y-soporte).
Las [incidencias](https://github.com/tfm-goldenpath/golden-path-lab/issues) sirven
para preguntas no sensibles y defectos reproducibles; no se declara un SLA.

<details>
<summary>Enlaces de la introducción anterior</summary>

<a id="por-qué-se-utiliza-inglés"></a>
[Idioma e índices](docs/ES/README.md).
<a id="contribuir-con-o-sin-ia"></a>
[Contribuir con o sin IA](CONTRIBUTING.md).
<a id="inicio-rápido"></a>
[Procedimiento del laboratorio](lab/README.es.md).
<a id="guías-en-español"></a>
[Guías en español](docs/ES/README.md).

</details>
