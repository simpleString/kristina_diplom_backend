import { Post, PrismaClient } from '@prisma/client';
import { ITestAnswerDTO, ITestFormDTO } from '../interfaces';

const prisma = new PrismaClient();

export class TestService {
  public getAllTest = async () => {
    return await prisma.test.findMany();
  };

  public getTestById = async (id: number) => {
    return await prisma.test.findFirst({ where: { id } });
  };

  public getTestForPost = async (postId: number) => {
    return await prisma.test.findMany({
      include: { questions: true, post: { select: {category: {select: {name: true}}} } },
      where: {
        postId,
      },
    });
  };

  public createTestsForPost = async (post: Post, tests: ITestFormDTO[]) => {
    const returnedPost = await Promise.all(
      tests.map(async (test) => {
        return await prisma.test.create({
          select: { post: true },
          data: {
            title: test.title,
            postId: post.id,
            questions: {
              create: test.options.map((option) => {
                return {
                  name: option.name,
                  isRightQuestion: test.rightAnswer === option.id,
                };
              }),
            },
          },
        });
      })
    );
    return returnedPost[0].post;
  };

  public recordUserResult = async (
    userId: number,
    answers: ITestAnswerDTO[]
  ) => {
    let result = 0;

    await Promise.all(
      answers.map(async (answer) => {
        const object = await prisma.question.findFirst({
          where: { id: answer.answerId },
          select: { isRightQuestion: true },
        });
        if (object?.isRightQuestion) result += 1;
      })
    );
    const test = await prisma.test.findFirst({
      where: { id: answers[0].testId },
    });
    if (test)
      return prisma.userResult.create({
        data: { result, userId, postId: test.postId },
      });
  };

  public getUserResult = async (userId: number, postId: number) => {
    const userResult = await prisma.userResult.aggregate({
      _max: {
        result: true,
      },
      where: { userId, postId },
    });

    const testCount = await prisma.test.count({ where: { postId } });
    const category = await prisma.post.findFirst({where: {id: postId}, select: {category: {select: {name: true, id: true
    }}}})
    return { amount: testCount, result: userResult._max.result || 0, category: category?.category, };
  };


  //   const userResult = await prisma.userResult.aggregate({
  //     _max: {
  //       result: true,
  //     },
  //     where: { userId, postId },
  //   });
  //
  //   const testCount = await prisma.test.count({ where: { postId } });
  //   return { amount: testCount, result: userResult._max.result || 0 };
  // };
}
