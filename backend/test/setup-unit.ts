import { Logger } from '@nestjs/common';

// Os services registram eventos no log (ADR 009); nos testes unitários eles só poluiriam a saída.
// Os specs que verificam logs espionam Logger.prototype, que continua sendo chamado.
Logger.overrideLogger(false);
