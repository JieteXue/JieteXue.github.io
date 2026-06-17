export class SimulationClient {
  constructor({ motionController, workerUrl, model, onSettled, onTick, WorkerClass = globalThis.Worker }) {
    if (!WorkerClass) {
      throw new Error("SimulationClient requires a browser Worker implementation.");
    }

    this.model = model;
    this.motionController = motionController;
    this.onSettled = onSettled;
    this.onTick = onTick;
    this.worker = new WorkerClass(workerUrl, { name: "Graph Worker" });
    this.worker.onmessage = (event) => this.handleMessage(event);
  }

  start(forces, alpha = 1) {
    this.worker.postMessage({
      nodes: this.model.makeWorkerNodes(),
      links: this.model.linkIds,
      forces,
      alpha,
      alphaTarget: 0,
      run: true
    });
  }

  updateForces(forces, alpha = 0.7) {
    this.worker.postMessage({ forces, alpha, run: true });
  }

  stop() {
    this.worker.postMessage({ stop: true });
  }

  pinNode(id, point, alpha = 0.3) {
    this.worker.postMessage({
      forceNode: { id, x: point.x, y: point.y },
      alpha,
      run: true
    });
  }

  releaseNode(id, alpha = 0.18) {
    this.worker.postMessage({
      forceNode: { id, x: null, y: null },
      alpha,
      run: true
    });
  }

  dispose() {
    this.worker.terminate();
  }

  handleMessage(event) {
    if (event.data.ignore) return;
    if (event.data.settled) {
      this.onSettled?.(event.data.metrics || null);
      return;
    }

    const ids = event.data.id || [];
    const coords = new Float32Array(event.data.buffer, 0, ids.length * 2);
    this.model.applyPositions(ids, coords);
    const metrics = event.data.metrics || null;
    const control = this.motionController?.onTick?.(metrics);
    if (control) {
      this.worker.postMessage({ motionControl: control, run: control.stop ? false : true });
    }
    this.onTick?.(metrics);
  }
}

export function createSimulationClient(options) {
  return new SimulationClient(options);
}
