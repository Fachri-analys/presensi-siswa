import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function MaxUtf8Bytes(maxBytes: number, options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'maxUtf8Bytes',
      target: target.constructor,
      propertyName: String(propertyKey),
      constraints: [maxBytes],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [limit] = args.constraints as [number];
          return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= limit;
        },
        defaultMessage(args: ValidationArguments) {
          const [limit] = args.constraints as [number];
          return `${args.property} maksimal ${limit} byte UTF-8.`;
        },
      },
    });
  };
}
