import {Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver, UseMiddleware} from 'type-graphql'
import {compare, hash} from 'bcryptjs'
import {User} from "./entity/User";
import { MyContext } from './MyContext';
import { createAccessToken, createRefreshToken } from './auth';
import { isAuth } from './isAuthMiddleware';

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

        res.cookie("jid", createRefreshToken(user), {httpOnly: true, maxAge: 604800*1000})

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
        } catch(err ) {
            console.log(err);
            return false;
        }

        return true;
    }
}