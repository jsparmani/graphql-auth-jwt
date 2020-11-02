import {Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware} from 'type-graphql'
import {compare, hash} from 'bcryptjs'
import {User} from "../entity/User";
import { MyContext } from '../utils/MyContext';
import { isAuth } from '../middleware/isAuthMiddleware';
import {createAccessToken, createRefreshToken} from "../utils/auth";
import { sendRefreshToken } from '../utils/sendRefreshToken';
import { getConnection } from 'typeorm';

@ObjectType()
class LoginResponse {
    @Field()
    accessToken: string
}

@Resolver()
export class UserResolver {
    @Query(() => String)
    hello() {
        return 'hi!'
    }

    @Query(() => String)
    @UseMiddleware(isAuth)
    bye(@Ctx() {payload}: MyContext) {
        return `your user id is ${payload!.userId}`;
    }

    @Query(() => [User])
    users() {
        return User.find();
    }

    @Mutation(() => Boolean)
    async revokeRefreshTokensForUser(
        @Arg('userId', () => Int) userId: number
    ) {
        await getConnection().getRepository(User).increment({id: userId}, 'tokenVersion', 1)

        return true;
    }

    @Mutation(() => LoginResponse)
    async login(
        @Arg('email', () => String) email: string,
        @Arg('password', () => String) password: string,
        @Ctx() {res}: MyContext
    ): Promise<LoginResponse> {

        const user = await User.findOne({where: {email}});

        if (!user) {
            throw new Error("User does not exist");
        }

        const valid = await compare(password, user.password);

        if (!valid) {
            throw new Error("Invalid Credentials!")
        }

        // login successfull

        sendRefreshToken(res, createRefreshToken(user));

        return {
            accessToken: createAccessToken(user)
        }

    }


    @Mutation(() => Boolean)
    async register(
        @Arg('email', () => String) email: string,
        @Arg('password', () => String) password: string
    ) {

        const hashedPassword = await hash(password, 12);
        try {
        await User.insert({
            email: email,
            password: hashedPassword
        })
        } catch(err) {
            console.log(err);
            return false;
        }

        return true;
    }
}