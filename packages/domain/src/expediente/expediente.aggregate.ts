import type { DomainEvent } from "../shared/domain-event.base.js";
import { assertTransition, type EstadoExpediente } from "./fsm.js";

export interface PlanAprobadoEvent extends DomainEvent {
  readonly type: "PlanAprobado";
}

/** Agregado raíz Expediente: muta estado solo vía FSM y registra Domain Events. */
export class ExpedienteAggregate {
  private events: DomainEvent[] = [];
  constructor(
    readonly id: string,
    private estado: EstadoExpediente,
  ) {}

  getEstado(): EstadoExpediente {
    return this.estado;
  }

  pullEvents(): DomainEvent[] {
    const e = [...this.events];
    this.events = [];
    return e;
  }

  transitar(a: EstadoExpediente): void {
    const r = assertTransition(this.estado, a);
    if (!r.ok) throw r.error;
    const previo = this.estado;
    this.estado = a;
    if (previo === "EN_PLAN" && a === "PLAN_APROBADO") {
      this.events.push({ type: "PlanAprobado", occurredAt: new Date(), expedienteId: this.id });
    }
  }
}
