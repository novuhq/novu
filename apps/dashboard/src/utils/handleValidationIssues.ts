import { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

type ValidationIssues = Record<
  string,
  {
    issueType: string;
    message: string;
    variableName?: string;
  }[]
>;

type HandleValidationIssuesProps<T extends FieldValues> = {
  fields: T;
  issues: ValidationIssues;
  setError: UseFormSetError<T>;
};

export const handleValidationIssues = <T extends FieldValues>(props: HandleValidationIssuesProps<T>) => {
  const { fields, issues, setError } = props;

  (Object.keys(issues) as Array<keyof typeof issues>).map((issueKey) => {
    const key = issueKey as FieldPath<T>;

    if (fields[key]) {
      setError(key, { message: issues[issueKey][0]?.message || 'Unknown error' });
    } else {
      console.error(`Issue for ${issueKey} found and does not correspond to a field`);
    }
  });
};
