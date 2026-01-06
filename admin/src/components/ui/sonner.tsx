import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            style={
                {
                    "--normal-bg": "hsl(var(--card))",
                    "--normal-text": "hsl(var(--card-foreground))",
                    "--normal-border": "hsl(var(--border))",
                    "--success-bg": "hsl(var(--success))",
                    "--success-text": "hsl(var(--success-foreground))",
                    "--error-bg": "hsl(var(--destructive))",
                    "--error-text": "hsl(var(--destructive-foreground))",
                } as React.CSSProperties
            }
            {...props}
        />
    )
}

export { Toaster }
