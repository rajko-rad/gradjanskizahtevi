
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@clerk/clerk-react";

const formSchema = z.object({
  title: z.string().min(5, { message: "Naslov mora imati najmanje 5 karaktera" }),
  description: z.string().min(20, { message: "Opis mora imati najmanje 20 karaktera" })
});

type FormValues = z.infer<typeof formSchema>;

interface SuggestRequestFormProps {
  categoryId: string;
  onSuccess?: () => void;
}

export function SuggestRequestForm({ categoryId, onSuccess }: SuggestRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: ""
    }
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Add to Supabase
      const { error } = await supabase
        .from('requests')
        .insert({
          title: data.title,
          description: data.description,
          category_id: categoryId,
          user_id: userId || null,
          status: 'pending'
        });

      if (error) {
        console.error("Error inserting request:", error);
        toast({
          title: "Greška",
          description: "Došlo je do greške prilikom slanja zahteva. Pokušajte ponovo.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Zahtev poslat",
          description: "Vaš predlog zahteva je uspešno poslat na razmatranje.",
        });
        
        form.reset();
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Greška",
        description: "Došlo je do neočekivane greške. Pokušajte ponovo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Naslov zahteva</FormLabel>
              <FormControl>
                <Input placeholder="Unesite naslov zahteva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opis zahteva</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detaljno opišite vaš predlog zahteva" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Šalje se..." : "Predloži zahtev"}
        </Button>
      </form>
    </Form>
  );
}
