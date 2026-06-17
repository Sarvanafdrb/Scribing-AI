"use client";

import * as React from "react";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext?.name) {
    throw new Error("useFormField should be used within <FormField>");
  }

  return getFieldState(fieldContext.name, formState);
};

const FormItem = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div className={cn("space-y-2", className)} {...props} />;
};

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={className} {...props} />
));

FormLabel.displayName = "FormLabel";

const FormControl = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const FormMessage = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  const { error } = useFormField();
  const message = error?.message as string | undefined;

  if (!message) return null;

  return (
    <p className={cn("text-sm text-destructive", className)} {...props}>
      {message}
    </p>
  );
};

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage };
