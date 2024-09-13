import { Box, Input, HStack, ModalBody, Flex, Button, ModalFooter } from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import Avatar from '@fastgpt/web/components/common/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import FormLabel from '@fastgpt/web/components/common/MyBox/FormLabel';

import { useTranslation } from 'next-i18next';
import React, { useMemo } from 'react';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { compressImgFileAndUpload } from '@/web/common/file/controller';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { useForm } from 'react-hook-form';
import SelectMember from './SelectMember';
import { useContextSelector } from 'use-context-selector';
import { TeamModalContext } from '../context';
import { postCreateGroup, putUpdateGroup } from '@/web/support/user/team/group/api';

export type GroupFormType = {
  avatar: string;
  name: string;
  members: string[];
};

function GroupEditModal({ onClose, editGroupId }: { onClose: () => void; editGroupId?: string }) {
  const { members, refetchGroups, groups, refetchMembers } = useContextSelector(
    TeamModalContext,
    (v) => v
  );
  const { t } = useTranslation();
  const { File: AvatarSelect, onOpen: onOpenSelectAvatar } = useSelectFile({
    fileType: '.jpg, .jpeg, .png',
    multiple: false
  });

  const group = useMemo(() => {
    return groups.find((item) => item._id === editGroupId);
  }, [editGroupId, groups]);

  const { register, handleSubmit, getValues, setValue, control } = useForm<GroupFormType>({
    defaultValues: {
      name: group?.name || '',
      avatar: group?.avatar || '',
      members: group?.members || []
    }
  });

  const { loading: uploadingAvatar, run: onSelectAvatar } = useRequest2(
    async (file: File[]) => {
      const src = await compressImgFileAndUpload({
        type: MongoImageTypeEnum.groupAvatar,
        file: file[0],
        maxW: 300,
        maxH: 300
      });
      return src;
    },
    {
      onSuccess: (src: string) => {
        setValue('avatar', src);
      }
    }
  );

  const { run: onCreate, loading: isLoadingCreate } = useRequest2(
    (data: GroupFormType) => {
      return postCreateGroup({
        name: data.name,
        avatar: data.avatar,
        memberIdList: data.members
      });
    },
    {
      onSuccess: () => Promise.all([onClose(), refetchGroups(), refetchMembers()])
    }
  );

  const { run: onUpdate, loading: isLoadingUpdate } = useRequest2(
    async (data: GroupFormType) => {
      if (!editGroupId) return;
      return putUpdateGroup({
        groupId: editGroupId,
        name: data.name,
        avatar: data.avatar,
        memberIdList: data.members
      });
    },
    {
      onSuccess: () => Promise.all([onClose(), refetchGroups(), refetchMembers()])
    }
  );

  const isLoading = isLoadingUpdate || isLoadingCreate || uploadingAvatar;

  return (
    <MyModal
      onClose={onClose}
      title={editGroupId ? t('user:team.group.edit') : t('user:team.group.create')}
      iconSrc="support/permission/collaborator"
      iconColor="primary.600"
      minW={['90vw', '1000px']}
      h={'600px'}
      isCentered
    >
      <ModalBody flex={1} overflow={'auto'} display={'flex'} flexDirection={'column'} gap={4}>
        <HStack>
          <FormLabel w="80px">{t('user:team.group.avatar')}</FormLabel>
          <Avatar src={getValues('avatar')} w={'32px'} />
          <HStack
            ml={2}
            cursor={'pointer'}
            onClick={onOpenSelectAvatar}
            _hover={{ color: 'primary.600' }}
          >
            <MyIcon name="edit" w={'14px'} />
            <Box fontSize={'sm'}>{t('common:common.Edit')}</Box>
          </HStack>
        </HStack>
        <HStack>
          <FormLabel w="80px" required minW="fit-content">
            {t('user:team.group.name')}
          </FormLabel>
          <Input
            bgColor="myGray.50"
            {...register('name', { required: true })}
            placeholder={t('user:team.group.name')}
          />
        </HStack>
        <Flex flex={'1 0 0'} h={0}>
          <FormLabel w="80px">{t('user:team.group.members')}</FormLabel>
          <Box flexGrow={1} h={'100%'}>
            <SelectMember
              allMembers={{
                member: members.map((item) => ({ ...item, type: 'member' }))
              }}
              control={control as any}
              mode="member"
            />
          </Box>
        </Flex>
      </ModalBody>
      <ModalFooter alignItems="flex-end">
        <Button
          isLoading={isLoading}
          onClick={handleSubmit((data) => {
            if (editGroupId) {
              onUpdate(data);
            } else {
              onCreate(data);
            }
          })}
        >
          {editGroupId ? t('common:common.Save') : t('common:new_create')}
        </Button>
      </ModalFooter>
      <AvatarSelect onSelect={onSelectAvatar} />
    </MyModal>
  );
}

export default GroupEditModal;
