import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type RefreshPayload = {
  sub: string;
  tokenId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });
    const tokens = await this.issueTokens(user.id, user.email);
    return { data: { user, ...tokens }, message: 'Compte cree.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        ...tokens,
      },
      message: 'Connexion reussie.',
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.userId !== payload.sub ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session expiree ou invalide.');
    }

    const matches = await bcrypt.compare(refreshToken, storedToken.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Session expiree ou invalide.');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(storedToken.user.id, storedToken.user.email);
    return { data: tokens, message: 'Session renouvelee.' };
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { id: payload.tokenId, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { data: { success: true }, message: 'Deconnexion reussie.' };
  }

  async me(userId: string) {
    const user = await this.usersService.findPublicById(userId);
    return { data: user };
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const expiresAt = this.getRefreshExpiresAt();
    const tokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: 'pending',
        expiresAt,
      },
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenId: tokenRecord.id },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { tokenHash: await bcrypt.hash(refreshToken, 12) },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Session expiree ou invalide.');
    }
  }

  private getRefreshExpiresAt() {
    const value = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const match = value.match(/^(\d+)([dhm])$/);
    const now = Date.now();
    if (!match) {
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = unit === 'd' ? 24 * 60 * 60 * 1000 : unit === 'h' ? 60 * 60 * 1000 : 60 * 1000;
    return new Date(now + amount * multiplier);
  }
}
