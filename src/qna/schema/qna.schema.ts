import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QnaDocument = HydratedDocument<Qna>;

@Schema({ timestamps: true })
export class Qna {
  @Prop({ required: true, unique: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;
}

export const QnaSchema = SchemaFactory.createForClass(Qna);