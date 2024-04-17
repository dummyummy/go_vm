import { BufferedTokenStream, Parser, TokenStream } from 'antlr4';
// @ts-ignore
import {
	ATN,
	ATNDeserializer,
	CharStream,
	DecisionState, DFA,
	LexerATNSimulator,
	PredictionContextCache,
	Token,
	Lexer
} from 'antlr4';
import GoLexer from './GoLexer';

export default abstract class GoBaseParser extends Parser {
    protected constructor(input: TokenStream) {
        super(input);
    }

    protected closingBracket(): boolean {
        const stream = this._input as BufferedTokenStream
        const prevTokenType = stream.LA(1);

        return prevTokenType === GoLexer.R_CURLY || prevTokenType === GoLexer.R_PAREN;
    }
}