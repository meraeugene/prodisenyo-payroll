import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileCheck2,
  Flag,
  HardHat,
  PackageCheck,
  ShoppingCart,
  UserRoundCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LandingIconName } from "@/features/landing-page/types";

const iconByName = {
  projects: Building2,
  estimate: Calculator,
  procurement: ShoppingCart,
  payroll: WalletCards,
  progress: BarChart3,
  cost: Coins,
  ceo: BriefcaseBusiness,
  engineer: HardHat,
  purchaser: PackageCheck,
  admin: UsersRound,
  assign: ClipboardCheck,
  approve: BadgeCheck,
  build: UserRoundCog,
  close: Flag,
} satisfies Record<LandingIconName, typeof CheckCircle2>;

interface LandingIconProps {
  name: LandingIconName;
  className?: string;
  strokeWidth?: number;
}

export default function LandingIcon({
  name,
  className,
  strokeWidth = 1.7,
}: LandingIconProps) {
  const Icon = iconByName[name] ?? FileCheck2;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
