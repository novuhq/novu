import { TopicEntity } from '@novu/dal';
import { TopicResponseDto } from '../../dtos/topic-response.dto';

export function mapTopicEntityToDto(topicEntity: TopicEntity): TopicResponseDto {
  return {
    _id: topicEntity._id,
    name: topicEntity.name,
    key: topicEntity.key,
    createdAt: topicEntity.createdAt,
    updatedAt: topicEntity.updatedAt,
  };
}
