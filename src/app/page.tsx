import { HeroCircuit } from "@/components/hero/circuit/HeroCircuit";
import { HomePage } from "@/components/home/HomePage";

// Hero under review: Circuit here and at /preview/circuit, Blueprint at /preview/blueprint.
export default function Home() {
  return <HomePage hero={<HeroCircuit />} />;
}
