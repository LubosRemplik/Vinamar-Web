import { DomainError } from '../errors/domain-error';

export class OrphanGapError extends DomainError {
  readonly status = 409;
  readonly type = 'https://vinamar.example/errors/orphan-gap';
  constructor() {
    super(
      'Termín by vedle obsazeného období vytvořil mezeru 3–6 nocí, kterou už nelze obsadit. ' +
        'Zvolte termín tak, aby mezera byla nejvýše 2 noci, nebo alespoň 7 nocí.',
    );
  }
}
