"use client"

import { FC, useState } from 'react'
import Button from './ui/Button'
import { addFriendSchema } from '@/lib/Validations/add-friend'
import axios from 'axios'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface AddFriendButtonProps {}
type FormData = z.infer<typeof addFriendSchema>

const AddFriendButton: FC<AddFriendButtonProps> = ({}) => {

    const{register , handleSubmit , setError} = useForm<FormData>({
        resolver:zodResolver(addFriendSchema)
    });
    
    const addFriend = async (email:string)=>{
        const[showSuccessState , setSuccessState] = useState<boolean>(false);
         try {
            const validatedEmail = addFriendSchema.parse({email});

            await axios.post('/api/friends/add', {
                email: validatedEmail,
            })
            setSuccessState(true);
         } catch (error) {
            
            if(error instanceof z.ZodError){
                setError('email',{message:error.message})
                return 
            }

            if(error instanceof axios.AxiosError){
                setError('email',{message:error.response?.data})
                return
            }
            setError('email',{message:'An error occurred'})
         }
    }






  return <form className='max-w-sm'>
    <label htmlFor='email' className='block text-sm font-medium leading-6 text-gray-900'>
        Add a friend by email
    </label>

    <div className='mt-2 flex gap-4'>
       <input
        {...register('email')} 
        type='text' 
        className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6' placeholder='you@example.com'/>    
        <Button>Add</Button>
    </div>
  </form>
}

export default AddFriendButton