import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva("studio-button", {
  variants: {
    variant: {
      primary: "btn-blue",
      secondary: "btn-outline",
      hero: "btn-white",
    },
  },
  defaultVariants: { variant: "primary" },
});
type Props = React.ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };
export function Button({ asChild, variant, className, ...rest }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(button({ variant }), className)} {...rest} />;
}
