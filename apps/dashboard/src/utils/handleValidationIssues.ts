import { FieldValues, UseFormSetError } from 'react-hook-form';

type ValidationIssues = Record<
  string,
  {
    issueType: string;
    message: string;
    variableName: string;
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
    if (issueKey in fields) {
      setError(issueKey as any, { message: issues[issueKey][0]?.message || 'Unknown error' });
    } else {
      console.log(`Issue for ${issueKey} found and does not correspond to a field`);
    }
  });
};
