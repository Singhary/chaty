import { cn } from '@/lib/utils'
import { cva , VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { FC } from 'react'

const buttonVariants = cva(
  'active:scale-95 inline-flex items-center justify-center rounded-md text-sm font-medium transition-color focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants:{
      variant:{
        default:'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500',
        ghost:'bg-transparent text-slate-900 hover:bg-slate-100 focus:ring-slate-500',
      },
      size:{
        default: 'h-10 px-4 py-2',
        small: 'h-9 px-2',
        large: 'h-11 px-8',
      },
    },
    
    defaultVariants:{
      size: 'default',
      variant: 'default',
    },
  }
)

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants>{
      isLoading?: boolean
}

const Button: FC<ButtonProps> = ({className , children , variant , isLoading , size , ...props}) => {
  return <button className={cn(buttonVariants({variant, size ,className}))} disabled={isLoading} {...props}>
    {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> :null}
    {children}
  </button>
}

export default Button