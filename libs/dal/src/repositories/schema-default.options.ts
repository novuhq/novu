export const schemaOptions = {
  timestamps: true,
  id: true,
  toJSON: {
    virtuals: true,
  },
  toObject: { virtuals: true },
};
