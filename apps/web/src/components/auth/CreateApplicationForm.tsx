import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../design-system';
import { api } from '../../api/api.client';

type Props = {};

export function CreateApplicationForm({}: Props) {
  const navigate = useNavigate();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      organizationName: string;
    }
  >((data) => api.post(`/v1/...`, data));

  const onCreateApplication = async (data) => {
    const itemData = {
      organizationName: data.organizationName,
    };

    navigate('/templates');
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  return (
    <form name="create-app-form" onSubmit={handleSubmit(onCreateApplication)}>
      <Input
        error={errors.organizationName?.message}
        {...register('organizationName', {
          required: 'Please input your app name',
        })}
        required
        label="Application Name"
        placeholder="What's the name of the app?"
        data-test-id="app-creation"
        mt={5}
      />
      <Button mt={30} inherit submit data-test-id="submit-btn">
        Create
      </Button>
    </form>
  );
}
