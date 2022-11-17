import { Depth, Pair } from '../../utils/enums';

export class OrderDto {
  pairName: Pair;
  depth: Depth[];
}
