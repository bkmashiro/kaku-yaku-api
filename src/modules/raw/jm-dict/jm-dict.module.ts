import { Module } from '@nestjs/common';
import { JmDictService } from './jm-dict.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JMDict } from '../entities/jm-dict.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JMDict])],
  providers: [JmDictService],
  exports: [JmDictService]
})
export class JmDictModule {}
